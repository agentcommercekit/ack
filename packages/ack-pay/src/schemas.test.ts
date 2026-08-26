import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { paymentRequestSchema as valibotPaymentRequestSchema } from "./schemas/valibot"
import { paymentRequestSchema as zodPaymentRequestSchema } from "./schemas/zod"

const paymentRequest = {
  id: "test-payment-request-id",
  paymentOptions: [
    {
      id: "test-payment-option-id",
      amount: 10,
      decimals: 2,
      currency: "USD",
      recipient: "sol:123",
    },
  ],
}

describe("paymentRequestSchema", () => {
  it("rejects invalid expiresAt strings instead of throwing", () => {
    const input = {
      ...paymentRequest,
      expiresAt: "invalid-date",
    }

    expect(v.safeParse(valibotPaymentRequestSchema, input).success).toBe(false)
    expect(zodPaymentRequestSchema.safeParse(input).success).toBe(false)
  })

  it("normalizes valid expiresAt inputs to an ISO string", () => {
    const expected = "2024-12-31T23:59:59.000Z"
    for (const expiresAt of [
      new Date("2024-12-31T23:59:59Z"),
      "2024-12-31T23:59:59Z",
    ]) {
      const input = { ...paymentRequest, expiresAt }

      const valibot = v.safeParse(valibotPaymentRequestSchema, input)
      expect(valibot.success && valibot.output.expiresAt).toBe(expected)

      const zod = zodPaymentRequestSchema.safeParse(input)
      expect(zod.success && zod.data.expiresAt).toBe(expected)
    }
  })
})
