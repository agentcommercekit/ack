import * as v from "valibot"
import { describe, expect, it } from "vitest"

import {
  paymentOptionSchema as valibotPaymentOptionSchema,
  paymentReceiptClaimSchema as valibotPaymentReceiptClaimSchema,
  paymentRequestSchema as valibotPaymentRequestSchema,
} from "./valibot"
import {
  paymentOptionSchema as zodPaymentOptionSchema,
  paymentReceiptClaimSchema as zodPaymentReceiptClaimSchema,
  paymentRequestSchema as zodPaymentRequestSchema,
} from "./zod"

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

const paymentRequestToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

const paymentReceiptClaim = {
  paymentRequestToken,
  paymentOptionId: "test-payment-option-id",
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

describe.each([
  [
    "valibot",
    {
      paymentRequest: (input: unknown) =>
        v.safeParse(valibotPaymentRequestSchema, input).success,
      paymentOption: (input: unknown) =>
        v.safeParse(valibotPaymentOptionSchema, input).success,
      paymentReceiptClaim: (input: unknown) =>
        v.safeParse(valibotPaymentReceiptClaimSchema, input).success,
    },
  ],
  [
    "zod",
    {
      paymentRequest: (input: unknown) =>
        zodPaymentRequestSchema.safeParse(input).success,
      paymentOption: (input: unknown) =>
        zodPaymentOptionSchema.safeParse(input).success,
      paymentReceiptClaim: (input: unknown) =>
        zodPaymentReceiptClaimSchema.safeParse(input).success,
    },
  ],
] as const)("%s rejects empty required payment fields", (_name, schema) => {
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

  it("rejects a payment receipt claim with an empty paymentOptionId", () => {
    expect(
      schema.paymentReceiptClaim({
        ...paymentReceiptClaim,
        paymentOptionId: "",
      }),
    ).toBe(false)
  })
})
