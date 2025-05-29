import { serve } from "@hono/node-server"
import { logger } from "@repo/api-utils/middleware/logger"
import {
  colors,
  errorMessage,
  log,
  logJson,
  successMessage
} from "@repo/cli-tools"
import {
  createPaymentReceipt,
  getDidResolver,
  isDidPkhUri,
  signCredential,
  verifyJwt,
  verifyPaymentToken
} from "agentcommercekit"
import { didPkhChainIdSchema } from "agentcommercekit/schemas/valibot"
import { Hono } from "hono"
import { env } from "hono/adapter"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"
import { erc20Abi, isAddressEqual } from "viem"
import { parseEventLogs } from "viem/utils"
import { chainId, publicClient, usdcAddress } from "./constants"
import { asAddress } from "./utils/as-address"
import { getKeypairInfo } from "./utils/keypair-info"
import type { paymentOptionSchema } from "agentcommercekit/schemas/valibot"
import type { Env } from "hono"

const app = new Hono<Env>()
app.use(logger())

const bodySchema = v.object({
  payload: v.string()
})

const paymentDetailsSchema = v.object({
  metadata: v.union([
    v.object({
      network: didPkhChainIdSchema,
      txHash: v.string()
    }),
    v.object({
      network: v.literal("stripe"),
      eventId: v.string()
    })
  ]),
  payerDid: v.string(),
  paymentToken: v.string()
})

/**
 * POST /
 *
 * This endpoint verifies the transaction details match the PaymentRequest requirements,
 * and creates a signed PaymentReceiptCredential.
 */
app.post("/", async (c) => {
  const serverIdentity = await getKeypairInfo(
    env(c).RECEIPT_SERVICE_PRIVATE_KEY_HEX
  )
  const didResolver = getDidResolver()

  const { payload } = v.parse(bodySchema, await c.req.json())

  log(colors.bold("\nReceipt Service: Processing payment proof"))
  log(colors.dim("Verifying JWT payload..."))

  const parsed = await verifyJwt(payload, {
    resolver: didResolver,
    policies: {
      aud: false
    }
  })

  // This demo uses did:pkh for all issuers, so we add this check, however, this
  // is not a requirement of the protocol.
  if (!isDidPkhUri(parsed.issuer)) {
    log(errorMessage("Invalid issuer, must be a did:pkh"))
    return c.json({ error: "Invalid issuer, must be a did:pkh" }, 400)
  }

  const paymentDetails = v.parse(paymentDetailsSchema, parsed.payload)

  log(colors.dim("Payment details:"))
  logJson(paymentDetails, colors.cyan)

  log(colors.dim("Verifying payment token..."))
  // Verify the payment token is not expired, etc.
  const { paymentRequest } = await verifyPaymentToken(
    paymentDetails.paymentToken,
    {
      resolver: didResolver
    }
  )

  // Load the payment option from the payment request matching our
  // preferred network.
  const paymentOption = paymentRequest.paymentOptions.find(
    (option) => option.network === paymentDetails.metadata.network
  )

  if (!paymentOption) {
    log(errorMessage("Payment option not found"))
    return c.json({ error: "Payment option not found" }, 400)
  }

  if (paymentOption.network === "stripe") {
    await verifyStripePayment(parsed.issuer, paymentDetails, paymentOption)
  } else if (paymentOption.network === chainId) {
    await verifyOnChainPayment(parsed.issuer, paymentDetails, paymentOption)
  } else {
    log(errorMessage("Invalid network"))
    throw new HTTPException(400, {
      message: "Invalid network"
    })
  }

  log(colors.dim("\nCreating payment receipt..."))
  const receipt = createPaymentReceipt({
    paymentToken: paymentDetails.paymentToken,
    paymentOptionId: paymentOption.id,
    issuer: serverIdentity.did,
    payerDid: parsed.issuer
  })

  const { jwt, verifiableCredential } = await signCredential(receipt, {
    did: serverIdentity.did,
    signer: serverIdentity.jwtSigner,
    alg: "ES256K",
    resolver: didResolver
  })

  log(successMessage("Receipt created successfully"))
  return c.json({
    receipt: jwt,
    details: verifiableCredential
  })
})

async function verifyStripePayment(
  _issuer: string,
  _paymentDetails: v.InferOutput<typeof paymentDetailsSchema>,
  _paymentOption: v.InferOutput<typeof paymentOptionSchema>
) {
  // Simulated stripe verification. In practice the receipt service and
  // the payment service would have a deeper connection to allow for
  // robust verification.
}

/**
 * verifies the on-chain payment details match the payment option
 */
async function verifyOnChainPayment(
  issuer: string,
  paymentDetails: v.InferOutput<typeof paymentDetailsSchema>,
  paymentOption: v.InferOutput<typeof paymentOptionSchema>
) {
  if (paymentDetails.metadata.network !== chainId) {
    log(errorMessage("Invalid network"))
    throw new HTTPException(400, {
      message: "Invalid network"
    })
  }

  const senderAddress = asAddress(issuer)
  const txHash = paymentDetails.metadata.txHash as `0x${string}`

  log(colors.dim("Loading transaction details..."))
  // load the contract transaction details for the hash
  // This method throws if the transaction is not found
  const txReceipt = await publicClient.getTransactionReceipt({ hash: txHash })
  if (txReceipt.status !== "success") {
    log(errorMessage(`Transaction failed: ${txHash}`))
    throw new HTTPException(400, {
      message: `Transaction failed: ${txHash}`
    })
  }

  // Find the `Transfer` event from the transaction logs that is for the payment
  // option recipient address.
  const logs = parseEventLogs({
    abi: erc20Abi,
    logs: txReceipt.logs,
    eventName: "Transfer",
    args: {
      to: asAddress(paymentOption.recipient)
    }
  })

  // Find the Transfer event in the logs
  const transferEvent = logs.find((log) =>
    isAddressEqual(log.address, usdcAddress)
  )

  if (!transferEvent) {
    log(errorMessage("Transfer event not found in transaction logs"))
    throw new HTTPException(400, {
      message: "Transfer event not found in transaction logs"
    })
  }

  log(colors.dim("\nOn-chain transfer details:"))
  log("From:", colors.cyan(transferEvent.args.from))
  log("To:", colors.cyan(transferEvent.args.to))
  log("Amount:", colors.cyan(transferEvent.args.value.toString()))
  log("Currency:", colors.cyan("USDC"))

  if (
    !isAddressEqual(transferEvent.args.to, asAddress(paymentOption.recipient))
  ) {
    log(errorMessage("Invalid recipient address"))
    throw new HTTPException(400, {
      message: "Invalid recipient address"
    })
  }

  if (transferEvent.args.value !== BigInt(paymentOption.amount)) {
    log(errorMessage("Invalid amount"))
    throw new HTTPException(400, {
      message: "Invalid amount"
    })
  }

  if (!isAddressEqual(transferEvent.args.from, senderAddress)) {
    log(errorMessage("Invalid sender address"))
    throw new HTTPException(400, {
      message: "Invalid sender address"
    })
  }

  // Optional:
  // Additional checks, like checking txHash block number timestamp occurred after payment_request issued
}

serve({
  port: 4568,
  fetch: app.fetch
})
