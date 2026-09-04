import { describe, expect, it } from "vitest"

import { authorizePayment, evaluatePaymentPolicy } from "./payment-policy"
import { createSpendLedger } from "./spend-ledger"

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
  const budgetPolicy = {
    allowedRecipients: [basePaymentOption.recipient],
    maxAutonomousAmount: { USDC: 1_000n },
    budget: {
      windowMs: 60_000,
      maxWindowAmount: { USDC: 3_000n },
    },
  }

  it("denies the split attack once the window budget is exhausted", () => {
    const ledger = createSpendLedger()
    const payment = { ...basePaymentOption, amount: 1_000 }

    for (let i = 0; i < 3; i++) {
      expect(
        authorizePayment(payment, budgetPolicy, {
          subject: "did:example:payer",
          reference: `attempt-${i}`,
          ledger,
        }),
      ).toEqual({ status: "approved" })
    }

    expect(
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer",
        reference: "attempt-3",
        ledger,
      }),
    ).toEqual({
      status: "denied",
      reason:
        "Payment exceeds the autonomous spend budget for the current window",
    })
  })

  it("does not consume budget for denied or approval-required payments", () => {
    const ledger = createSpendLedger()

    expect(
      authorizePayment(
        { ...basePaymentOption, amount: 10_000 },
        budgetPolicy,
        {
          subject: "did:example:payer",
          reference: "too-large",
          ledger,
        },
      ).status,
    ).toBe("denied")

    expect(
      authorizePayment(
        basePaymentOption,
        { ...budgetPolicy, allowedRecipients: [] },
        {
          subject: "did:example:payer",
          reference: "unknown-recipient",
          ledger,
        },
      ).status,
    ).toBe("approval_required")

    expect(ledger.spentWithin("did:example:payer", "USDC", 60_000)).toBe(0n)
  })

  it("re-authorizes the same reference without double-counting", () => {
    const ledger = createSpendLedger()
    const payment = { ...basePaymentOption, amount: 1_000 }
    const auth = {
      subject: "did:example:payer",
      reference: "stripe-attempt",
      ledger,
    }

    expect(authorizePayment(payment, budgetPolicy, auth)).toEqual({
      status: "approved",
    })
    expect(authorizePayment(payment, budgetPolicy, auth)).toEqual({
      status: "approved",
    })
    expect(ledger.spentWithin("did:example:payer", "USDC", 60_000)).toBe(
      1_000n,
    )
  })

  it("isolates subjects and currencies", () => {
    const ledger = createSpendLedger()
    const payment = { ...basePaymentOption, amount: 1_000 }

    for (let i = 0; i < 3; i++) {
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer-a",
        reference: `a-${i}`,
        ledger,
      })
    }

    expect(
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer-b",
        reference: "b-0",
        ledger,
      }),
    ).toEqual({ status: "approved" })

    expect(
      authorizePayment(
        { ...payment, currency: "USD", decimals: 2, amount: 500 },
        {
          ...budgetPolicy,
          maxAutonomousAmount: { USDC: 1_000n, USD: 500n },
          budget: {
            windowMs: 60_000,
            maxWindowAmount: { USDC: 3_000n, USD: 2_000n },
          },
        },
        {
          subject: "did:example:payer-a",
          reference: "usd-0",
          ledger,
        },
      ),
    ).toEqual({ status: "approved" })
  })

  it("expires spend out of the rolling window", () => {
    let now = 1_000_000
    const ledger = createSpendLedger({ now: () => now })
    const payment = { ...basePaymentOption, amount: 1_000 }

    for (let i = 0; i < 3; i++) {
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer",
        reference: `old-${i}`,
        ledger,
      })
    }

    now += 60_001

    expect(
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer",
        reference: "after-expiry",
        ledger,
      }),
    ).toEqual({ status: "approved" })
  })

  it("skips the window check when no budget is configured", () => {
    const ledger = createSpendLedger()
    const decision = authorizePayment(
      basePaymentOption,
      {
        allowedRecipients: [basePaymentOption.recipient],
        maxAutonomousAmount: { USDC: 1_000n },
      },
      {
        subject: "did:example:payer",
        reference: "no-budget",
        ledger,
      },
    )

    expect(decision).toEqual({ status: "approved" })
    expect(ledger.spentWithin("did:example:payer", "USDC", 60_000)).toBe(0n)
  })

  it("records and approves an over-budget payment when allowOverBudget is set", () => {
    const ledger = createSpendLedger()
    const payment = { ...basePaymentOption, amount: 1_000 }

    for (let i = 0; i < 3; i++) {
      expect(
        authorizePayment(payment, budgetPolicy, {
          subject: "did:example:payer",
          reference: `fill-${i}`,
          ledger,
        }),
      ).toEqual({ status: "approved" })
    }

    expect(
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer",
        reference: "settled-callback",
        ledger,
      }),
    ).toEqual({
      status: "denied",
      reason:
        "Payment exceeds the autonomous spend budget for the current window",
    })

    expect(
      authorizePayment(payment, budgetPolicy, {
        subject: "did:example:payer",
        reference: "settled-callback",
        ledger,
        allowOverBudget: true,
      }),
    ).toEqual({ status: "approved" })

    expect(ledger.spentWithin("did:example:payer", "USDC", 60_000)).toBe(
      4_000n,
    )
  })
})
