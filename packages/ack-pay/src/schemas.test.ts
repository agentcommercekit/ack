import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { paymentRequestSchema as valibotPaymentRequestSchema } from "./schemas/valibot"
import { paymentRequestSchema as zodV3PaymentRequestSchema } from "./schemas/zod/v3"
import { paymentRequestSchema as zodV4PaymentRequestSchema } from "./schemas/zod/v4"

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
  it("reports invalid expiresAt strings as schema errors", () => {
    const input = {
      ...paymentRequest,
      expiresAt: "invalid-date",
    }

    expect(v.safeParse(valibotPaymentRequestSchema, input).success).toBe(false)
    expect(zodV3PaymentRequestSchema.safeParse(input).success).toBe(false)
    expect(zodV4PaymentRequestSchema.safeParse(input).success).toBe(false)
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

      const v3 = zodV3PaymentRequestSchema.safeParse(input)
      expect(v3.success && v3.data.expiresAt).toBe(expected)

      const v4 = zodV4PaymentRequestSchema.safeParse(input)
      expect(v4.success && v4.data.expiresAt).toBe(expected)
    }
  })
})
