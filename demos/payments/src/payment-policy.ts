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
   * NOTE: this is a per-transaction cap only. `budget` below adds the
   * cumulative limit, since a per-transaction cap is trivially split-gameable.
   */
  maxAutonomousAmount: Readonly<Record<string, bigint>>
  /**
   * Optional cumulative budget across a rolling window, in the same
   * per-currency subunits as `maxAutonomousAmount`. A per-transaction cap on
   * its own is trivially defeated by splitting one payment into many smaller
   * ones (`cap × N`), so the demo also bounds the total. A currency with no
   * configured budget is left to the per-transaction cap alone.
   */
  budget?: {
    windowMs: number
    maxWindowAmount: Readonly<Record<string, bigint>>
  }
}

export const demoPaymentPolicy: PaymentPolicy = {
  allowedRecipients: [],
  maxAutonomousAmount: {
    // 5.00 USD (2 decimals) and 5.000000 USDC (6 decimals)
    USD: 500n,
    USDC: 5_000_000n,
  },
  budget: {
    windowMs: 60 * 60 * 1000,
    maxWindowAmount: {
      // Three payments at the per-transaction cap, so the fourth is denied.
      USD: 1_500n,
      USDC: 15_000_000n,
    },
  },
}

/**
 * Parses an ACK-Pay amount, following the repo-wide BigInt money convention
 * (see receipt-service.ts, index.ts). `BigInt()` throws on the
 * fractional/malformed amounts the ACK-Pay schema's string branch permits.
 */
function parseSubunitAmount(
  amount: PaymentOption["amount"],
): bigint | undefined {
  try {
    return BigInt(amount)
  } catch {
    return undefined
  }
}

/**
 * Looks a currency up in a per-currency limit map.
 *
 * `currency` is an unconstrained wire string, so this guards against inherited
 * prototype keys (e.g. "constructor", "toString") that would otherwise resolve
 * to a non-bigint value and slip past the comparisons below.
 */
function limitFor(
  limits: Readonly<Record<string, bigint>>,
  currency: string,
): bigint | undefined {
  const limit = Object.prototype.hasOwnProperty.call(limits, currency)
    ? limits[currency]
    : undefined

  return typeof limit === "bigint" ? limit : undefined
}

export function evaluatePaymentPolicy(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
): PaymentPolicyDecision {
  const amount = parseSubunitAmount(paymentOption.amount)
  if (amount === undefined) {
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

  const limit = limitFor(policy.maxAutonomousAmount, paymentOption.currency)
  if (limit === undefined) {
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

/**
 * Amounts spent in the current window, keyed by currency.
 *
 * The demo has a single autonomous payer, and ACK-Pay carries no payer
 * identity on the execution request, so one process-wide map is enough here. A
 * real Payment Service keys the budget by payer and stores it durably. See the
 * demo README for what else this leaves out.
 */
const spentAmounts = new Map<string, { at: number; amount: bigint }[]>()

/**
 * Drops the amounts that have aged out of the window and returns the rest.
 * The returned array is the stored one, so appending to it records a spend.
 */
function amountsWithinWindow(currency: string, windowMs: number, now: number) {
  const cutoff = now - windowMs
  const amounts = (spentAmounts.get(currency) ?? []).filter(
    ({ at }) => at > cutoff,
  )
  spentAmounts.set(currency, amounts)

  return amounts
}

/**
 * Checks a payment against the policy's rolling budget, on top of the
 * per-transaction decision from `evaluatePaymentPolicy`.
 *
 * @param paymentOption - The payment option being authorized
 * @param policy - The policy to enforce
 * @param record - Whether to charge the amount against the window. Pass `true`
 *   at the point the payment actually settles, so a payment is counted once.
 * @returns The budget decision, or `approved` when no budget applies
 */
export function evaluateSpendBudget(
  paymentOption: PaymentOption,
  policy: PaymentPolicy = demoPaymentPolicy,
  record = false,
): PaymentPolicyDecision {
  const amount = parseSubunitAmount(paymentOption.amount)
  const limit = policy.budget
    ? limitFor(policy.budget.maxWindowAmount, paymentOption.currency)
    : undefined

  // Nothing to add: no budget, no budget for this currency, or an amount
  // `evaluatePaymentPolicy` has already denied.
  if (!policy.budget || limit === undefined || amount === undefined) {
    return { status: "approved" }
  }

  // Read the window and record in one synchronous step. The request handler
  // awaits before policy runs, so a check that returned to the event loop
  // before writing would let two concurrent payments both observe the
  // pre-payment total and both pass.
  const now = Date.now()
  const amounts = amountsWithinWindow(
    paymentOption.currency,
    policy.budget.windowMs,
    now,
  )
  const spent = amounts.reduce((total, entry) => total + entry.amount, 0n)

  if (spent + amount > limit) {
    return {
      status: "denied",
      reason:
        "Payment exceeds the autonomous spend budget for the current window",
    }
  }

  if (record) {
    amounts.push({ at: now, amount })
  }

  return { status: "approved" }
}

/** Clears the window. Exported for tests, which share the module. */
export function resetSpendBudget(): void {
  spentAmounts.clear()
}
