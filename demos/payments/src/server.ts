import { serve } from "@hono/node-server"
import { logger } from "@repo/api-utils/middleware/logger"
import { colors, errorMessage, log, successMessage } from "@repo/cli-tools"
import {
  createPaymentRequestResponse,
  curveToJwtAlgorithm,
  getDidResolver,
  verifyPaymentReceipt
} from "agentcommercekit"
import { Hono } from "hono"
import { env } from "hono/adapter"
import { HTTPException } from "hono/http-exception"
import { PAYMENT_SERVICE_URL, RECEIPT_SERVICE_URL, chainId } from "./constants"
import { getKeypairInfo } from "./utils/keypair-info"
import type { PaymentRequestInit } from "agentcommercekit"
import type { Env, TypedResponse } from "hono"

const app = new Hono<Env>()
app.use(logger())

/**
 * Simple hono error handler
 */
app.onError((e, c) => {
  if (e instanceof HTTPException) {
    return e.getResponse()
  }

  console.error(colors.red("Error in server:"), e)
  return c.json({ error: e.message }, 500)
})

/**
 * Simple endpoint which is protected by a 402 payment required response
 */
app.get("/", async (c): Promise<TypedResponse<{ message: string }>> => {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX)
  const didResolver = getDidResolver()

  const { did: receiptIssuerDid } = await getKeypairInfo(
    env(c).RECEIPT_SERVICE_PRIVATE_KEY_HEX
  )
  const trustedReceiptIssuers: string[] = [receiptIssuerDid]

  const authorizationHeader = c.req.header("Authorization")
  const receipt = authorizationHeader?.replace("Bearer ", "")

  log(colors.bold("\nServer: Processing request"))
  log(colors.dim("Checking for receipt in Authorization header..."))

  /**
   * Check for Receipt in the Authorization header
   */
  if (!receipt) {
    log(colors.yellow("No receipt found, generating payment request..."))

    // Build a payment request with a single payment option for USDC on Base Sepolia
    const paymentRequestInit: PaymentRequestInit = {
      id: crypto.randomUUID(),
      paymentOptions: [
        // USDC on Base
        {
          id: "usdc-base-sepolia",
          amount: BigInt(50000).toString(), // 5 cents in USDC subunits
          decimals: 6,
          currency: "USDC",
          recipient: serverIdentity.crypto.address, // This could be a did:pkh
          network: chainId, // eip155:84532
          receiptService: RECEIPT_SERVICE_URL
        },
        // Stripe payment option
        {
          id: "stripe-usd",
          currency: "USD",
          network: "stripe",
          amount: 5, // 5 cents in USD subunits
          decimals: 2,
          recipient: serverIdentity.did,
          paymentService: PAYMENT_SERVICE_URL,
          receiptService: RECEIPT_SERVICE_URL
        }
      ]
    }

    // Generate the ACK-Pay Payment Request, which is a signed JWT detailing what needs to be paid.
    const paymentRequest402Response = await createPaymentRequestResponse(
      paymentRequestInit,
      {
        issuer: serverIdentity.did,
        signer: serverIdentity.jwtSigner,
        algorithm: curveToJwtAlgorithm(serverIdentity.keypair.curve)
      }
    )

    log(successMessage("Payment request generated"))
    throw new HTTPException(402, { res: paymentRequest402Response })
  }

  try {
    log(colors.dim("Verifying receipt credential..."))
    // Verify the presented ACK Receipt (VC) to ensure it's authentic, trusted, and matches the payment requirements.
    await verifyPaymentReceipt(receipt, {
      resolver: didResolver,
      trustedReceiptIssuers,
      paymentRequestIssuer: serverIdentity.did,
      verifyPaymentTokenJwt: true
    })
  } catch (e) {
    console.log(errorMessage("Error verifying receipt"), e)

    throw new HTTPException(400, {
      message: "Invalid receipt"
    })
  }

  log(successMessage("Receipt verified successfully"))
  return c.json({
    message: "Access granted"
  })
})

serve({
  port: 4567,
  fetch: app.fetch
})
