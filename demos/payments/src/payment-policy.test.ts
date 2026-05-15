import { describe, expect, it } from "vitest"

import { evaluatePaymentPolicy } from "./payment-policy"

const basePaymentOption = {
  id: "base-usdc",
  amount: 100,
  decimals: 2,
  currency: "USDC",
  recipient: "did:example:merchant",
}

describe("evaluatePaymentPolicy", () => {
  it("approves below-threshold payments to allowed recipients", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: [basePaymentOption.recipient],
      maxAutonomousAmount: 1_000,
    })

    expect(decision).toEqual({
      status: "approved",
    })
  })

  it("approves payments back to the trusted request issuer", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: [],
      maxAutonomousAmount: 1_000,
      trustedRequestIssuer: basePaymentOption.recipient,
    })

    expect(decision).toEqual({
      status: "approved",
    })
  })

  it("requires approval before execution for unknown recipients", () => {
    const decision = evaluatePaymentPolicy(basePaymentOption, {
      allowedRecipients: ["did:example:trusted-merchant"],
      maxAutonomousAmount: 1_000,
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
        maxAutonomousAmount: 1_000,
      },
    )

    expect(decision).toEqual({
      status: "denied",
      reason: "Payment amount exceeds the autonomous spend limit",
    })
  })
})
