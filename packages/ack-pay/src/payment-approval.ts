/**
 * A request for human or policy-system approval before a payment is executed.
 *
 * ACK-Pay does not prescribe an approval workflow. This type gives applications
 * and demos a shared object shape for approval-required paths.
 */
export interface PaymentApprovalRequest {
  id: string
  paymentRequestId: string
  paymentOptionId?: string
  requesterDid?: string
  reason?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}

export type PaymentApprovalDecisionValue = "approved" | "denied"

/**
 * The result of a human or policy-system approval request.
 */
export interface PaymentApprovalDecision {
  requestId: string
  decision: PaymentApprovalDecisionValue
  approverDid?: string
  reason?: string
  decidedAt: string
  metadata?: Record<string, unknown>
}
