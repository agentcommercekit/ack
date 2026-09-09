import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { paymentOptionSchema as valibotPaymentOptionSchema } from "./valibot"
import { paymentOptionSchema as zodPaymentOptionSchema } from "./zod"

const paymentOption = {
  id: "test-payment-option-id",
  decimals: 2,
  currency: "USD",
  recipient: "did:example:recipient",
}

function acceptsAmount(amount: number | string) {
  const value = { ...paymentOption, amount }

  return {
    valibot: v.safeParse(valibotPaymentOptionSchema, value).success,
    zod: zodPaymentOptionSchema.safeParse(value).success,
  }
}

describe("paymentOptionSchema amount", () => {
  it.each([1, 100, "1", "100", "9007199254740993"])(
    "accepts positive integer amount %s",
    (amount) => {
      expect(acceptsAmount(amount)).toEqual({ valibot: true, zod: true })
    },
  )

  it.each([0, -1, 1.5, "", "0", "-1", "1.5", "abc"])(
    "rejects invalid amount %s",
    (amount) => {
      expect(acceptsAmount(amount)).toEqual({ valibot: false, zod: false })
    },
  )
})

describe.each([
  [
    "valibot",
    (input: unknown) => v.safeParse(valibotPaymentOptionSchema, input).success,
  ],
  ["zod", (input: unknown) => zodPaymentOptionSchema.safeParse(input).success],
] as const)("%s paymentOptionSchema empty fields", (_, accepts) => {
  it.each(["id", "currency", "recipient"] as const)(
    "rejects a payment option with an empty %s",
    (field) => {
      expect(
        accepts({
          ...paymentOption,
          amount: 1,
          [field]: "",
        }),
      ).toBe(false)
    },
  )
})
