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
  /**
   * Per-transaction autonomous spend limits, expressed in each currency's
   * smallest subunit (matching `PaymentOption.amount`) and keyed by currency
   * code. Keeping the limit per-currency avoids comparing a single flat
   * threshold across currencies with different decimals (e.g. USD at 2dp vs
   * USDC at 6dp). A currency with no configured limit is denied.
   *
   * NOTE: this is a per-transaction cap only, not a cumulative or rate budget.
   * See the demo README — a real spend control needs windowed/cumulative
   * limits, since a per-transaction cap is trivially split-gameable.
   */
  maxAutonomousAmount: Readonly<Record<string, bigint>>
}

export const demoPaymentPolicy: PaymentPolicy = {
  allowedRecipients: [],
  maxAutonomousAmount: {
    // 5.00 USD (2 decimals) and 5.000000 USDC (6 decimals)
    USD: 500n,
    USDC: 5_000_000n,
  },
}

export function evaluatePaymentPolicy(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
): PaymentPolicyDecision {
  let amount: bigint
  try {
    // Follows the repo-wide BigInt money convention (see receipt-service.ts,
    // index.ts). `BigInt()` throws on fractional/malformed amounts the
    // ACK-Pay schema's string branch otherwise permits.
    amount = BigInt(paymentOption.amount)
  } catch {
    return {
      status: "denied",
      reason: "Payment amount must be a positive integer in subunits",
    }
  }

  if (amount <= 0n) {
    return {
      status: "denied",
      reason: "Payment amount must be greater than zero",
    }
  }

  // `currency` is an unconstrained wire string, so guard against inherited
  // prototype keys (e.g. "constructor", "toString") that would otherwise
  // resolve to a non-bigint value and slip past the comparison below.
  const limit = Object.prototype.hasOwnProperty.call(
    policy.maxAutonomousAmount,
    paymentOption.currency,
  )
    ? policy.maxAutonomousAmount[paymentOption.currency]
    : undefined
  if (typeof limit !== "bigint") {
    return {
      status: "denied",
      reason: `No autonomous spend limit configured for currency ${paymentOption.currency}`,
    }
  }

  if (amount > limit) {
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
