import type { PaymentOption } from "agentcommercekit"

export type PaymentPolicyDecision =
  | {
      status: "approved"
    }
  | {
      status: "approval_required" | "denied"
      reason: string
    }

export interface PaymentPolicy {
  allowedRecipients: readonly string[]
  maxAutonomousAmount: number
}

export const demoPaymentPolicy: PaymentPolicy = {
  allowedRecipients: [],
  maxAutonomousAmount: 1_000_000,
}

export function evaluatePaymentPolicy(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
): PaymentPolicyDecision {
  const amount = Number(paymentOption.amount)

  if (!Number.isFinite(amount)) {
    return {
      status: "denied",
      reason: "Payment amount must be a finite number",
    }
  }

  if (amount > policy.maxAutonomousAmount) {
    return {
      status: "denied",
      reason: "Payment amount exceeds the autonomous spend limit",
    }
  }

  if (!policy.allowedRecipients.includes(paymentOption.recipient)) {
    return {
      status: "approval_required",
      reason: "Recipient is not on the autonomous payment allowlist",
    }
  }

  return {
    status: "approved",
  }
}

export function assertPaymentPolicyApproved(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
) {
  const decision = evaluatePaymentPolicy(paymentOption, policy)

  if (decision.status !== "approved") {
    throw new Error(decision.reason)
  }
}
