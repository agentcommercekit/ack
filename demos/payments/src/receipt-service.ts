import { createHash } from "node:crypto"
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
  createSolanaRpc,
  signature as toSignature
} from "@solana/kit"
import {
  createPaymentReceipt,
  getDidResolver,
  isDidPkhUri,
  parseJwtCredential,
  signCredential,
  verifyJwt,
  verifyPaymentRequestToken
} from "agentcommercekit"
import { caip2ChainIdSchema } from "agentcommercekit/schemas/valibot"
import bs58 from "bs58"
import { Hono } from "hono"
import { env } from "hono/adapter"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"
import { erc20Abi, isAddressEqual } from "viem"
import { parseEventLogs } from "viem/utils"
import { chainId, publicClient, solana, usdcAddress } from "./constants"
import { asAddress } from "./utils/as-address"
import { getKeypairInfo } from "./utils/keypair-info"
import type { Rpc, Signature } from "@solana/kit"
// Types narrowed inline to avoid @solana/web3.js dependency
import type { paymentOptionSchema } from "agentcommercekit/schemas/valibot"
import type { GetTransactionApi } from "gill"
import type { Env } from "hono"

const app = new Hono<Env>()
app.use(logger())

const bodySchema = v.object({
  payload: v.string()
})

const paymentDetailsSchema = v.object({
  metadata: v.union([
    v.object({
      network: caip2ChainIdSchema,
      txHash: v.string()
    }),
    v.object({
      network: v.literal("stripe"),
      eventId: v.string()
    })
  ]),
  payerDid: v.string(),
  paymentRequestToken: v.string()
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

  log(colors.dim("Verifying payment request token..."))
  // Verify the payment request token is not expired, etc.
  const { paymentRequest } = await verifyPaymentRequestToken(
    paymentDetails.paymentRequestToken,
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
  } else if (paymentOption.network === solana.chainId) {
    await verifySolanaPayment(parsed.issuer, paymentDetails, paymentOption)
  } else {
    log(errorMessage("Invalid network"))
    throw new HTTPException(400, {
      message: "Invalid network"
    })
  }

  log(colors.dim("\nCreating payment receipt..."))
  const receipt = createPaymentReceipt({
    paymentRequestToken: paymentDetails.paymentRequestToken,
    paymentOptionId: paymentOption.id,
    issuer: serverIdentity.did,
    payerDid: parsed.issuer
  })

  const jwt = await signCredential(receipt, {
    did: serverIdentity.did,
    signer: serverIdentity.jwtSigner,
    alg: "ES256K"
  })

  log(successMessage("Receipt created successfully"))
  return c.json({
    receipt: jwt,
    details: await parseJwtCredential(jwt, didResolver)
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

function getTransaction(rpc: Rpc<GetTransactionApi>, signature: Signature) {
  return rpc
    .getTransaction(signature, {
      commitment: solana.commitment,
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 0 as const
    })
    .send()
}

type GetTransactionResult = Awaited<ReturnType<typeof getTransaction>>

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

async function verifySolanaPayment(
  _issuer: string,
  paymentDetails: v.InferOutput<typeof paymentDetailsSchema>,
  paymentOption: v.InferOutput<typeof paymentOptionSchema>
) {
  if (paymentDetails.metadata.network !== solana.chainId) {
    log(errorMessage("Invalid network"))
    throw new HTTPException(400, { message: "Invalid network" })
  }
  const signature = paymentDetails.metadata.txHash
  const rpc = createSolanaRpc(solana.rpcUrl)
  log(colors.dim("Loading Solana transaction details..."))
  // Poll for the transaction to appear; RPC may not have it immediately after send

  let tx: GetTransactionResult | null = null
  const maxAttempts = 10
  const delayMs = 1000

  for (let i = 0; i < maxAttempts; i++) {
    tx = await getTransaction(rpc, toSignature(signature))
    if (tx && !tx.meta?.err) break
    await new Promise((r) => setTimeout(r, delayMs))
  }
  if (!tx || tx.meta?.err) {
    log(errorMessage("Solana transaction not found or failed"))
    throw new HTTPException(400, { message: "Invalid transaction" })
  }

  // Verify Memo binds to the Payment Request
  const expectedMemo = createHash("sha256")
    .update(paymentDetails.paymentRequestToken)
    .digest("hex")
    .toLowerCase()

  const memos = extractMemosFromParsedTx(tx).map((m) => m.trim().toLowerCase())
  if (!memos.includes(expectedMemo)) {
    log(errorMessage("Payment memo missing or invalid"))
    throw new HTTPException(400, { message: "Invalid memo" })
  }

  // Validate postTokenBalances reflect the transfer to recipient for the mint
  const mint = solana.usdcMint
  const recipient =
    typeof paymentOption.recipient === "string"
      ? paymentOption.recipient
      : String(paymentOption.recipient)

  const dec = paymentOption.decimals
  const expectedAmount = BigInt(paymentOption.amount)

  type TokenBalance = {
    mint: string
    owner: string
    uiTokenAmount: { amount: string; decimals: number }
  }
  const post = (tx.meta?.postTokenBalances ?? []) as unknown as TokenBalance[]
  const pre = (tx.meta?.preTokenBalances ?? []) as unknown as TokenBalance[]

  const preBal = pre.find((b) => b.mint === mint && b.owner === recipient)
  const postBal = post.find((b) => b.mint === mint && b.owner === recipient)

  if (!postBal) {
    log(errorMessage("Recipient post token balance not found"))
    throw new HTTPException(400, { message: "Recipient not credited" })
  }
  if (postBal.uiTokenAmount.decimals !== dec) {
    log(errorMessage("Invalid token decimals"))
    throw new HTTPException(400, { message: "Invalid token decimals" })
  }

  const toBigInt = (v: unknown): bigint => {
    if (typeof v === "string") return BigInt(v)
    if (typeof v === "number") return BigInt(v)
    if (typeof v === "bigint") return v
    return 0n
  }
  const preAmount = toBigInt(preBal?.uiTokenAmount.amount ?? "0")
  const postAmount = toBigInt(postBal.uiTokenAmount.amount)
  const delta = postAmount - preAmount
  if (delta !== expectedAmount) {
    log(errorMessage("Invalid amount"))
    throw new HTTPException(400, { message: "Invalid amount" })
  }
}

function extractMemosFromParsedTx(txParsed: GetTransactionResult): string[] {
  const memos: string[] = []

  if (txParsed === null) return memos

  const scan = (ix: unknown) => {
    if (typeof ix !== "object" || ix === null) return

    // Parsed memo
    if (
      "program" in ix &&
      (ix as { program?: unknown }).program === "spl-memo"
    ) {
      const parsed = (ix as { parsed?: unknown }).parsed
      if (typeof parsed === "string") {
        memos.push(parsed)
        return
      }
      const info = (parsed as { info?: { memo?: string } } | undefined)?.info
      if (info?.memo) memos.push(String(info.memo))
      return
    }

    // Partially decoded memo: data is base-58
    if ("programId" in ix) {
      const pidField = (
        ix as {
          programId: string | { toBase58(): string }
        }
      ).programId
      const pid = typeof pidField === "string" ? pidField : pidField.toBase58()
      const data = (ix as { data?: unknown }).data
      if (pid === MEMO_PROGRAM_ID && typeof data === "string") {
        try {
          const raw = bs58.decode(data)
          memos.push(Buffer.from(raw).toString("utf8"))
        } catch {
          // ignore malformed memo data
        }
      }
    }
  }

  for (const ix of txParsed.transaction.message.instructions) scan(ix)
  for (const inner of txParsed.meta?.innerInstructions ?? []) {
    for (const ix of inner.instructions) scan(ix)
  }
  return memos
}

serve({
  port: 4568,
  fetch: app.fetch
})
