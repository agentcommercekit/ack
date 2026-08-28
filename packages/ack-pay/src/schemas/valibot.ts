import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/valibot"
import * as v from "valibot"

const urlOrDidUri = v.union([v.pipe(v.string(), v.url()), didUriSchema])

const nonEmptyString = v.pipe(v.string(), v.minLength(1))

const timestampSchema = v.pipe(
  v.union([v.date(), v.string()]),
  v.check((input) => !Number.isNaN(new Date(input).getTime()), "Invalid date"),
  v.transform((input) => new Date(input).toISOString()),
)

export const paymentOptionSchema = v.object({
  id: nonEmptyString,
  amount: v.union([v.pipe(v.number(), v.integer(), v.gtValue(0)), v.string()]),
  decimals: v.pipe(v.number(), v.integer(), v.toMinValue(0)),
  currency: nonEmptyString,
  recipient: nonEmptyString,
  network: v.optional(v.string()),
  paymentService: v.optional(urlOrDidUri),
  receiptService: v.optional(urlOrDidUri),
})

export const paymentRequestSchema = v.object({
  id: nonEmptyString,
  description: v.optional(v.string()),
  serviceCallback: v.optional(v.pipe(v.string(), v.url())),
  expiresAt: v.optional(timestampSchema),
  paymentOptions: v.pipe(
    v.tupleWithRest([paymentOptionSchema], paymentOptionSchema),
    v.nonEmpty(),
  ),
})

export const paymentReceiptClaimSchema = v.object({
  paymentRequestToken: jwtStringSchema,
  paymentOptionId: v.string(),
  metadata: v.optional(v.record(v.string(), v.unknown())),
})
