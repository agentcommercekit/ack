import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import * as v from "valibot"

const urlOrDidUri = v.union([v.pipe(v.string(), v.url()), didUriSchema])

export const paymentOptionSchema = v.object({
  id: v.string(),
  amount: v.union([v.pipe(v.number(), v.integer(), v.gtValue(0)), v.string()]),
  decimals: v.pipe(v.number(), v.integer(), v.toMinValue(0)),
  currency: v.string(),
  recipient: v.string(),
  network: v.optional(v.string()),
  paymentService: v.optional(urlOrDidUri),
  receiptService: v.optional(urlOrDidUri)
})

export const paymentRequestSchema = v.object({
  id: v.string(),
  description: v.optional(v.string()),
  serviceCallback: v.optional(v.pipe(v.string(), v.url())),
  expiresAt: v.optional(
    v.pipe(
      v.union([v.date(), v.string()]),
      v.transform((input) => new Date(input).toISOString())
    )
  ),
  paymentOptions: v.pipe(
    v.tupleWithRest([paymentOptionSchema], paymentOptionSchema),
    v.nonEmpty()
  )
})

export const paymentReceiptClaimSchema = v.object({
  paymentToken: v.string(), // Often a JwtString but not required
  paymentOptionId: v.string(),
  metadata: v.optional(v.record(v.string(), v.unknown()))
})

export const paymentRequestBodySchema = v.object({
  paymentRequest: paymentRequestSchema,
  paymentToken: v.string() // Often a JwtString but not required
})
