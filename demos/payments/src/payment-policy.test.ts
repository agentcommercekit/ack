import { beforeEach, describe, expect, it } from "vitest"

import {
  authorizePayment,
  evaluatePaymentPolicy,
  type PaymentPolicy,
} from "./payment-policy"
import { createSpendLedger, type SpendLedger } from "./spend-ledger"

const basePaymentOption = {
  id: "base-usdc",
  amount: 100,
  decimals: 6,
  currency: "USDC",
  recipient: "did:example:merchant",
}

describe("evaluatePaymentPolicy", () => {
  it("approves below-threshold payments to allowed recipients", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: [basePaymentOption.recipient],
      maxAutonomousAmount: { USDC: 1_000n },
    })

    expect(decision).toEqual({
      status: "approved",
    })
  })

  it("approves string subunit amounts within the limit", () => {
    const decision = evaluatePaymentPolicy(
      { ...basePaymentOption, amount: "50000" },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 5_000_000n },
      },
    )

    expect(decision).toEqual({
      status: "approved",
    })
  })

  it("does not approve self-asserted recipients without an allowlist", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: [],
      maxAutonomousAmount: { USDC: 1_000n },
    })

    expect(decision).toEqual({
      status: "approval_required",
      reason: "Recipient is not on the autonomous payment allowlist",
    })
  })

  it("requires approval before execution for unknown recipients", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: ["did:example:trusted-merchant"],
      maxAutonomousAmount: { USDC: 1_000n },
    })

    expect(decision).toEqual({
      status: "approval_required",
      reason: "Recipient is not on the autonomous payment allowlist",
    })
  })

  it("denies payments above the autonomous spend limit", () => {
    const decision = evaluatePaymentPolicy(
      {
        ...basePaymentOption,
        amount: 10_000,
      },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "Payment amount exceeds the autonomous spend limit",
    })
  })

  it("applies the per-currency limit in the currency's own subunits", () => {
    const policy = {
      allowedRecipients: [basePaymentOption.recipient],
      // 5.00 USD (2dp) and 5.000000 USDC (6dp) — same value, different subunits
      maxAutonomousAmount: { USD: 500n, USDC: 5_000_000n },
    }

    // 4.00 USD is below the USD limit
    expect(
      evaluatePaymentPolicy(
        { ...basePaymentOption, amount: 400, decimals: 2, currency: "USD" },
        policy,
      ),
    ).toEqual({ status: "approved" })

    // The same 400 subunits in USDC (0.0004) is also below the USDC limit,
    // confirming each currency is bounded by its own threshold
    expect(
      evaluatePaymentPolicy({ ...basePaymentOption, amount: 400 }, policy),
    ).toEqual({ status: "approved" })
  })

  it("denies currencies with no configured limit", () => {
    const decision = evaluatePaymentPolicy(
      { ...basePaymentOption, currency: "SOL", decimals: 9 },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "No autonomous spend limit configured for currency SOL",
    })
  })

  it("denies non-positive amounts", () => {
    const decision = evaluatePaymentPolicy(
      { ...basePaymentOption, amount: 0 },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "Payment amount must be greater than zero",
    })
  })

  it("denies currencies matching inherited prototype keys", () => {
    const decision = evaluatePaymentPolicy(
      { ...basePaymentOption, currency: "constructor" },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "No autonomous spend limit configured for currency constructor",
    })
  })

  it("denies fractional or malformed amounts the schema permits as strings", () => {
    const decision = evaluatePaymentPolicy(
      { ...basePaymentOption, amount: "1.5" },
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "Payment amount must be a positive integer in subunits",
    })
  })
})

describe("authorizePayment", () => {
  const WINDOW_MS = 60 * 60 * 1000
  const SUBJECT = "did:example:payment-service"

  const budgetedPolicy: PaymentPolicy = {
    allowedRecipients: [basePaymentOption.recipient],
    maxAutonomousAmount: { USDC: 1_000n },
    budget: {
      windowMs: WINDOW_MS,
      maxWindowAmount: { USDC: 2_500n },
    },
  }

  let clock: number
  let ledger: SpendLedger

  function authorize(
    reference: string,
    amount: number,
    policy: PaymentPolicy = budgetedPolicy,
  ) {
    return authorizePayment({ ...basePaymentOption, amount }, policy, {
      subject: SUBJECT,
      reference,
      ledger,
    })
  }

  beforeEach(() => {
    clock = 1_000_000
    ledger = createSpendLedger({ now: () => clock })
  })

  it("approves a payment inside both the per-transaction cap and the budget", () => {
    expect(authorize("payment-1", 1_000)).toEqual({ status: "approved" })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(1_000n)
  })

  it("denies below-cap payments once they exhaust the window budget", () => {
    // Every payment here passes the per-transaction cap on its own. The budget
    // is what stops one payment being split into an unbounded number of them.
    expect(authorize("payment-1", 1_000)).toEqual({ status: "approved" })
    expect(authorize("payment-2", 1_000)).toEqual({ status: "approved" })

    expect(authorize("payment-3", 1_000)).toEqual({
      status: "denied",
      reason:
        "Payment exceeds the autonomous spend budget for the current window",
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(2_000n)
  })

  it("approves again once the earlier payments age out of the window", () => {
    authorize("payment-1", 1_000)
    authorize("payment-2", 1_000)
    clock += WINDOW_MS

    expect(authorize("payment-3", 1_000)).toEqual({ status: "approved" })
  })

  it("counts one payment attempt once across repeated authorizations", () => {
    // The Stripe flow authorizes twice for a single payment: once for the
    // payment URL, once on the callback.
    expect(authorize("payment-1", 1_000)).toEqual({ status: "approved" })
    expect(authorize("payment-1", 1_000)).toEqual({ status: "approved" })

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(1_000n)
  })

  it("does not consume budget for a payment the per-transaction cap denies", () => {
    expect(authorize("payment-1", 2_000)).toEqual({
      status: "denied",
      reason: "Payment amount exceeds the autonomous spend limit",
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
  })

  it("does not consume budget for a payment that requires approval", () => {
    const decision = authorizePayment(
      basePaymentOption,
      { ...budgetedPolicy, allowedRecipients: [] },
      { subject: SUBJECT, reference: "payment-1", ledger },
    )

    expect(decision).toEqual({
      status: "approval_required",
      reason: "Recipient is not on the autonomous payment allowlist",
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
  })

  it("denies currencies with no configured window budget", () => {
    const decision = authorizePayment(
      basePaymentOption,
      {
        ...budgetedPolicy,
        maxAutonomousAmount: { USDC: 1_000n, USD: 1_000n },
        budget: { windowMs: WINDOW_MS, maxWindowAmount: { USD: 2_500n } },
      },
      { subject: SUBJECT, reference: "payment-1", ledger },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "No autonomous spend budget configured for currency USDC",
    })
  })

  it("skips the budget check when the policy configures no budget", () => {
    const unbudgetedPolicy: PaymentPolicy = {
      allowedRecipients: [basePaymentOption.recipient],
      maxAutonomousAmount: { USDC: 1_000n },
    }

    expect(authorize("payment-1", 1_000, unbudgetedPolicy)).toEqual({
      status: "approved",
    })
    expect(authorize("payment-2", 1_000, unbudgetedPolicy)).toEqual({
      status: "approved",
    })
    expect(authorize("payment-3", 1_000, unbudgetedPolicy)).toEqual({
      status: "approved",
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
  })

  it("tracks the budget per payer subject", () => {
    authorize("payment-1", 1_000)
    authorize("payment-2", 1_000)

    const other = authorizePayment(
      { ...basePaymentOption, amount: 1_000 },
      budgetedPolicy,
      {
        subject: "did:example:other-payer",
        reference: "payment-3",
        ledger,
      },
    )

    expect(other).toEqual({ status: "approved" })
  })
})
