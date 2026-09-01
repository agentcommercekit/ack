import * as v from "valibot"
import { describe, expect, it } from "vitest"

import {
  paymentOptionSchema as valibotPaymentOptionSchema,
  paymentRequestSchema as valibotPaymentRequestSchema,
} from "./schemas/valibot"
import {
  paymentOptionSchema as zodPaymentOptionSchema,
  paymentRequestSchema as zodPaymentRequestSchema,
} from "./schemas/zod"

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

const paymentOption = paymentRequest.paymentOptions[0]

const validators = {
  valibot: {
    paymentRequest: (input: unknown) =>
      v.safeParse(valibotPaymentRequestSchema, input).success,
    paymentOption: (input: unknown) =>
      v.safeParse(valibotPaymentOptionSchema, input).success,
  },
  zod: {
    paymentRequest: (input: unknown) =>
      zodPaymentRequestSchema.safeParse(input).success,
    paymentOption: (input: unknown) =>
      zodPaymentOptionSchema.safeParse(input).success,
  },
} as const

describe.each(Object.entries(validators))("%s payment schemas", (_, schema) => {
  it.each(["id", "currency", "recipient"] as const)(
    "rejects a payment option with an empty %s",
    (field) => {
      expect(
        schema.paymentOption({
          ...paymentOption,
          [field]: "",
        }),
      ).toBe(false)
    },
  )

  it("rejects a payment request with an empty id", () => {
    expect(
      schema.paymentRequest({
        ...paymentRequest,
        id: "",
      }),
    ).toBe(false)
  })
})

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
