import * as v from "valibot"
import { describe, expect, it } from "vitest"

import * as valibot from "./schemas/valibot"
import * as zodv3 from "./schemas/zod/v3"
import * as zodv4 from "./schemas/zod/v4"

const schemas = {
  valibot: {
    approvalRequest: (value: unknown) =>
      v.safeParse(valibot.paymentApprovalRequestSchema, value).success,
    approvalDecision: (value: unknown) =>
      v.safeParse(valibot.paymentApprovalDecisionSchema, value).success,
  },
  zodv3: {
    approvalRequest: (value: unknown) =>
      zodv3.paymentApprovalRequestSchema.safeParse(value).success,
    approvalDecision: (value: unknown) =>
      zodv3.paymentApprovalDecisionSchema.safeParse(value).success,
  },
  zodv4: {
    approvalRequest: (value: unknown) =>
      zodv4.paymentApprovalRequestSchema.safeParse(value).success,
    approvalDecision: (value: unknown) =>
      zodv4.paymentApprovalDecisionSchema.safeParse(value).success,
  },
}

describe.each(Object.entries(schemas))(
  "payment approval schemas (%s)",
  (_name, schema) => {
    it("validates approval requests", () => {
      expect(
        schema.approvalRequest({
          id: "approval-1",
          paymentRequestId: "payment-request-1",
          paymentOptionId: "usdc-base",
          requesterDid: "did:web:merchant.example",
          reason: "Amount exceeds automated policy limit.",
          expiresAt: "2026-01-01T00:00:00.000Z",
          metadata: { policyId: "spend-limit" },
        }),
      ).toBe(true)
    })

    it("rejects malformed approval requests", () => {
      expect(
        schema.approvalRequest({
          id: "approval-1",
          requesterDid: "not-a-did",
        }),
      ).toBe(false)
    })

    it("validates approval decisions", () => {
      expect(
        schema.approvalDecision({
          requestId: "approval-1",
          decision: "approved",
          approverDid: "did:web:operator.example",
          reason: "Reviewed by operator.",
          decidedAt: "2026-01-01T00:01:00.000Z",
          metadata: { ticketId: "ticket-1" },
        }),
      ).toBe(true)
    })

    it("rejects malformed approval decisions", () => {
      expect(
        schema.approvalDecision({
          requestId: "approval-1",
          decision: "pending",
          decidedAt: "2026-01-01T00:01:00.000Z",
        }),
      ).toBe(false)
    })
  },
)
