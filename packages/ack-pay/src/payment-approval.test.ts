import { describe, expect, it } from "vitest"

import {
  isPaymentApprovalDecision,
  isPaymentApprovalRequest,
} from "./payment-approval"

const request = {
  id: "approval-1",
  paymentRequestId: "payment-123",
  paymentOptionId: "usdc-base",
  requesterDid: "did:web:agent.example.com",
  reason: "Amount exceeds agent spend policy",
  expiresAt: "2026-09-03T12:00:00.000Z",
}

const decision = {
  requestId: "approval-1",
  decision: "approved" as const,
  approverDid: "did:web:owner.example.com",
  decidedAt: "2026-09-03T12:01:00.000Z",
}

describe("isPaymentApprovalRequest", () => {
  it("accepts a minimal request", () => {
    expect(
      isPaymentApprovalRequest({
        id: "a",
        paymentRequestId: "p",
      }),
    ).toBe(true)
  })

  it("accepts a fully populated request", () => {
    expect(isPaymentApprovalRequest(request)).toBe(true)
  })

  it("rejects missing paymentRequestId", () => {
    expect(isPaymentApprovalRequest({ id: "a" })).toBe(false)
  })
})

describe("isPaymentApprovalDecision", () => {
  it("accepts approved and denied", () => {
    expect(isPaymentApprovalDecision(decision)).toBe(true)
    expect(
      isPaymentApprovalDecision({
        ...decision,
        decision: "denied",
        reason: "Out of policy",
      }),
    ).toBe(true)
  })

  it("rejects unknown decisions and invalid timestamps", () => {
    expect(isPaymentApprovalDecision({ ...decision, decision: "maybe" })).toBe(
      false,
    )
    expect(
      isPaymentApprovalDecision({ ...decision, decidedAt: "not-a-date" }),
    ).toBe(false)
  })
})
