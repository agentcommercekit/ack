import type { PaymentOption } from "agentcommercekit"

import type { SpendLedger } from "./spend-ledger"

export type PaymentPolicyDecision =
  | {
      status: "approved"
    }
  | {
      status: "approval_required" | "denied"
      reason: string
    }

interface SpendBudget {
  /** Length of the rolling window, in milliseconds. */
  windowMs: number
  /**
   * Cumulative spend allowed inside the window, in each currency's smallest
   * subunit and keyed by currency code, following the same per-currency shape
   * as `maxAutonomousAmount`. A currency with no configured budget is denied.
   */
  maxWindowAmount: Readonly<Record<string, bigint>>
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
   * This bounds a single payment only. `budget` bounds their sum, which is
   * what stops one payment being split into many below-cap ones.
   */
  maxAutonomousAmount: Readonly<Record<string, bigint>>
  /**
   * Optional cumulative budget over a rolling window, enforced by
   * `authorizePayment` against a `SpendLedger`. When omitted, only the
   * per-transaction cap above applies.
   */
  budget?: SpendBudget
}

/** Rolling window the demo budget is measured over. */
const DEMO_SPEND_WINDOW_MS = 60 * 60 * 1000

export const demoPaymentPolicy: PaymentPolicy = {
  allowedRecipients: [],
  maxAutonomousAmount: {
    // 5.00 USD (2 decimals) and 5.000000 USDC (6 decimals)
    USD: 500n,
    USDC: 5_000_000n,
  },
  budget: {
    windowMs: DEMO_SPEND_WINDOW_MS,
    maxWindowAmount: {
      // 20.00 in each currency: four payments at the per-transaction cap,
      // rather than an unbounded number of them.
      USD: 2_000n,
      USDC: 20_000_000n,
    },
  },
}

/**
 * Follows the repo-wide BigInt money convention (see receipt-service.ts,
 * index.ts). `BigInt()` throws on fractional/malformed amounts the ACK-Pay
 * schema's string branch otherwise permits.
 */
function parseSubunitAmount(amount: PaymentOption["amount"]): bigint | null {
  try {
    return BigInt(amount)
  } catch {
    return null
  }
}

/**
 * `currency` is an unconstrained wire string, so guard against inherited
 * prototype keys (e.g. "constructor", "toString") that would otherwise resolve
 * to a non-bigint value and slip past a comparison.
 */
function currencyLimit(
  limits: Readonly<Record<string, bigint>>,
  currency: string,
): bigint | null {
  if (!Object.prototype.hasOwnProperty.call(limits, currency)) {
    return null
  }

  const limit = limits[currency]
  return typeof limit === "bigint" ? limit : null
}

export function evaluatePaymentPolicy(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
): PaymentPolicyDecision {
  const amount = parseSubunitAmount(paymentOption.amount)

  if (amount === null) {
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

  const limit = currencyLimit(
    policy.maxAutonomousAmount,
    paymentOption.currency,
  )

  if (limit === null) {
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

export interface SpendAuthorization {
  /**
   * The party the budget is tracked against: the payer this Payment Service
   * spends on behalf of. The demo has a single autonomous payer, so this is
   * the Payment Service's own DID. A multi-tenant service would key the budget
   * on its authenticated payer instead — ACK-Pay does not carry a payer
   * identity on the payment execution request today.
   */
  subject: string
  /**
   * Stable identifier for one payment attempt, so the two calls of the Stripe
   * flow (payment URL, then callback) reserve once rather than twice. See
   * `spendReference` in payment-service.ts.
   */
  reference: string
  ledger: SpendLedger
}

/**
 * Applies the full policy to a payment before it is executed or signed: the
 * per-transaction checks in `evaluatePaymentPolicy`, then the cumulative
 * rolling-window budget when the policy configures one.
 *
 * An approved decision has reserved the amount against the window. The caller
 * must `commit` the reservation once the payment settles, or `release` it if
 * execution fails.
 *
 * @param paymentOption - The verified payment option about to be executed
 * @param policy - The policy to apply
 * @param authorization - Budget subject, attempt reference, and ledger
 * @returns The policy decision
 */
export function authorizePayment(
  paymentOption: PaymentOption,
  policy: PaymentPolicy,
  authorization: SpendAuthorization,
): PaymentPolicyDecision {
  const decision = evaluatePaymentPolicy(paymentOption, policy)

  if (decision.status !== "approved" || !policy.budget) {
    return decision
  }

  const amount = parseSubunitAmount(paymentOption.amount)
  if (amount === null) {
    // Unreachable: `evaluatePaymentPolicy` already denied unparseable amounts.
    return {
      status: "denied",
      reason: "Payment amount must be a positive integer in subunits",
    }
  }

  const limit = currencyLimit(
    policy.budget.maxWindowAmount,
    paymentOption.currency,
  )

  if (limit === null) {
    return {
      status: "denied",
      reason: `No autonomous spend budget configured for currency ${paymentOption.currency}`,
    }
  }

  const result = authorization.ledger.reserve({
    reference: authorization.reference,
    subject: authorization.subject,
    currency: paymentOption.currency,
    amount,
    windowMs: policy.budget.windowMs,
    limit,
  })

  if (result.status === "exceeded") {
    return {
      status: "denied",
      reason:
        "Payment exceeds the autonomous spend budget for the current window",
    }
  }

  return {
    status: "approved",
  }
}
