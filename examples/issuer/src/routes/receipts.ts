import {
  apiSuccessResponse,
  type ApiResponse,
} from "@repo/api-utils/api-response"
import {
  internalServerError,
  notFound,
  unauthorized,
} from "@repo/api-utils/exceptions"
import { signedPayloadValidator } from "@repo/api-utils/middleware/signed-payload-validator"
import {
  createPaymentReceipt,
  isPaymentReceiptCredential,
  verifyPaymentRequestToken,
  type DidUri,
  type PaymentRequest,
} from "agentcommercekit"
import { didUriSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type Env } from "hono"
import { env } from "hono/adapter"
import * as v from "valibot"

import type { CredentialResponse } from "@/lib/types"

import {
  createCredential as createDatabaseCredential,
  getCredential,
  revokeCredential,
} from "@/db/queries/credentials"
import { buildSignedCredential } from "@/lib/credentials/build-signed-credential"
import { database } from "@/middleware/database"
import { didResolver } from "@/middleware/did-resolver"
import { issuer } from "@/middleware/issuer"

const app = new Hono<Env>()

app.use("*", issuer())
app.use("*", didResolver())
app.use("*", database())

const bodySchema = v.object({
  metadata: v.object({
    txHash: v.string(),
  }),
  payerDid: didUriSchema,
  paymentRequestToken: v.string(),
  paymentOptionId: v.string(),
})

/**
 * Stubbed out payment verification. Typically we would verify that the payment
 * occurred, and that it satisfies the original Payment Request. For these
 * examples, we simply allow it through.
 *
 * For an example of validating a payment, see the Receipt Service in
 * `<root>/demos/payments/src/receipt-service.ts`
 */
async function verifyPayment(
  _paymentRequest: PaymentRequest,
  _txHash: string,
  _walletDid: DidUri,
) {
  return Promise.resolve(true)
}

/**
 * POST /credentials/receipts
 *
 * @description Generates a payment receipt credential for a verified payment
 *
 * Request Body, signed by the wallet that made the payment:
 * ```ts
 * SignedPayload<{
 *   metadata: {
 *     txHash: string  // Transaction hash of the payment
 *   },
 *   payerDid: string,        // DID URI of the payer
 *   paymentRequestToken: string,    // Signed payment request token
 *   paymentOptionId: string  // ID of the payment option used
 * }
 * ```
 *
 * @returns {
 *   credential: <Verifiable<W3CCredential>>,
 *   jwt: JWTString
 * }
 * Auth: Request must be signed by the wallet DID that made the payment
 */
app.post(
  "/",
  signedPayloadValidator("json", bodySchema),
  issuer(),
  async (c): Promise<ApiResponse<CredentialResponse>> => {
    const payload = c.req.valid("json")
    const issuer = c.get("issuer")
    const db = c.get("db")
    const resolver = c.get("resolver")
    const { BASE_URL } = env(c)

    const { paymentRequestToken, paymentOptionId, metadata, payerDid } =
      payload.body

    const { paymentRequest } = await verifyPaymentRequestToken(
      paymentRequestToken,
      {
        resolver,
      },
    )

    const verified = await verifyPayment(
      paymentRequest,
      metadata.txHash,
      payload.issuer,
    )

    if (!verified) {
      unauthorized("Payment verification failed")
    }

    const receipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId,
      issuer: issuer.did,
      payerDid,
    })

    const dbCredential = await createDatabaseCredential(db, {
      credentialType: "PaymentReceiptCredential",
      baseCredential: receipt,
    })

    const result = await buildSignedCredential({
      baseUrl: BASE_URL,
      path: "/credentials/receipts",
      issuer,
      credential: dbCredential,
      resolver,
    })

    return c.json(apiSuccessResponse(result))
  },
)

export default app

/**
 * GET /credentials/receipts/:id
 *
 * @description Retrieves a payment receipt credential by its unique identifier
 *
 * URL Parameters:
 * - id: string - Unique identifier of the receipt credential
 *
 * @returns {
 *   credential: <Verifiable<W3CCredential>>,
 *   jwt: JWTString
 * }
 */
app.get("/:id", async (c): Promise<ApiResponse<CredentialResponse>> => {
  const { id } = c.req.param()
  const db = c.get("db")
  const issuer = c.get("issuer")
  const resolver = c.get("resolver")
  const { BASE_URL } = env(c)
  const credential = await getCredential(db, parseInt(id))

  if (!credential) {
    return notFound("Credential not found")
  }

  const result = await buildSignedCredential({
    baseUrl: BASE_URL,
    path: "/credentials/receipts",
    issuer,
    credential,
    resolver,
  })

  return c.json(apiSuccessResponse(result))
})

const deleteBodySchema = v.object({
  id: v.number(),
})

/**
 * DELETE /credentials/receipts
 *
 * @description
 * Revokes a payment receipt credential by flipping the bit on the credential's Status List.
 * For demo purposes, we only allow the original payment request token issuer to revoke the receipt.
 *
 * Request Body, signed by the original payment request token issuer:
 * ```ts
 * SignedPayload<{
 *   id: string  // ID of the receipt credential to revoke
 * }>
 * ```
 *
 * @returns Success response with null data
 * Auth: Request must be signed by the original Payment Request issuer
 */
app.delete(
  "/",
  signedPayloadValidator("json", deleteBodySchema),
  async (c): Promise<ApiResponse<null>> => {
    const payload = c.req.valid("json")
    const db = c.get("db")
    const resolver = c.get("resolver")

    const databaseCredential = await getCredential(db, payload.body.id)
    if (!databaseCredential) {
      return notFound("Credential not found")
    }

    const credential = databaseCredential.baseCredential

    if (!isPaymentReceiptCredential(credential)) {
      return internalServerError("Invalid stored credential")
    }

    const { parsed } = await verifyPaymentRequestToken(
      credential.credentialSubject.paymentRequestToken,
      {
        resolver,
      },
    )

    // For now, only allows the original issuer of the payment request token
    // to revoke the receipt.
    if (parsed.issuer !== payload.issuer) {
      return unauthorized()
    }

    await revokeCredential(db, databaseCredential)

    return c.json(apiSuccessResponse(null))
  },
)
