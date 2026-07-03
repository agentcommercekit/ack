import { describe, expect, it } from "vitest"

import { evaluatePaymentPolicy } from "./payment-policy"

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
