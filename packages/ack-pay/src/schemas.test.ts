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
})
