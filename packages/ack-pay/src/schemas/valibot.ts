import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/valibot"
import * as v from "valibot"

const urlOrDidUri = v.union([v.pipe(v.string(), v.url()), didUriSchema])

const timestampSchema = v.pipe(
  v.union([v.date(), v.string()]),
  v.transform((input) => new Date(input).toISOString()),
)

export const paymentOptionSchema = v.object({
  id: v.string(),
  amount: v.union([v.pipe(v.number(), v.integer(), v.gtValue(0)), v.string()]),
  decimals: v.pipe(v.number(), v.integer(), v.toMinValue(0)),
  currency: v.string(),
  recipient: v.string(),
  network: v.optional(v.string()),
  paymentService: v.optional(urlOrDidUri),
  receiptService: v.optional(urlOrDidUri),
})

export const paymentRequestSchema = v.object({
  id: v.string(),
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

export const paymentApprovalRequestSchema = v.object({
  id: v.string(),
  paymentRequestId: v.string(),
  paymentOptionId: v.optional(v.string()),
  requesterDid: v.optional(didUriSchema),
  reason: v.optional(v.string()),
  expiresAt: v.optional(timestampSchema),
  metadata: v.optional(v.record(v.string(), v.unknown())),
})

export const paymentApprovalDecisionValueSchema = v.union([
  v.literal("approved"),
  v.literal("denied"),
])

export const paymentApprovalDecisionSchema = v.object({
  requestId: v.string(),
  decision: paymentApprovalDecisionValueSchema,
  approverDid: v.optional(didUriSchema),
  reason: v.optional(v.string()),
  decidedAt: timestampSchema,
  metadata: v.optional(v.record(v.string(), v.unknown())),
})
