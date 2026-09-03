import * as v from "valibot"

/** ISO-8601 date-time strings only — not date-only (`YYYY-MM-DD`). */
const isoTimestamp = v.pipe(v.string(), v.isoTimestamp())

export const paymentApprovalRequestSchema = v.object({
  id: v.string(),
  paymentRequestId: v.string(),
  paymentOptionId: v.optional(v.string()),
  requesterDid: v.optional(v.string()),
  reason: v.optional(v.string()),
  expiresAt: v.optional(isoTimestamp),
  metadata: v.optional(v.record(v.string(), v.unknown())),
})

export const paymentApprovalDecisionSchema = v.object({
  requestId: v.string(),
  decision: v.picklist(["approved", "denied"]),
  approverDid: v.optional(v.string()),
  reason: v.optional(v.string()),
  decidedAt: isoTimestamp,
  metadata: v.optional(v.record(v.string(), v.unknown())),
})

export type PaymentApprovalRequest = v.InferOutput<
  typeof paymentApprovalRequestSchema
>
export type PaymentApprovalDecision = v.InferOutput<
  typeof paymentApprovalDecisionSchema
>
export type PaymentApprovalDecisionKind = PaymentApprovalDecision["decision"]

export function isPaymentApprovalRequest(
  value: unknown,
): value is PaymentApprovalRequest {
  return v.is(paymentApprovalRequestSchema, value)
}

export function isPaymentApprovalDecision(
  value: unknown,
): value is PaymentApprovalDecision {
  return v.is(paymentApprovalDecisionSchema, value)
}
