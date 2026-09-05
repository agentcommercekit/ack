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

function acceptsDecimals(decimals: number) {
  const value = { ...paymentOption, amount: 10, decimals }

  return {
    valibot: v.safeParse(valibotPaymentOptionSchema, value).success,
    zod: zodPaymentOptionSchema.safeParse(value).success,
  }
}

describe("paymentOptionSchema decimals", () => {
  it.each([0, 2, 18])("accepts non-negative decimals %s", (decimals) => {
    expect(acceptsDecimals(decimals)).toEqual({ valibot: true, zod: true })
  })

  it.each([-1, -6, 1.5])(
    "rejects invalid decimals %s instead of clamping",
    (decimals) => {
      expect(acceptsDecimals(decimals)).toEqual({ valibot: false, zod: false })
    },
  )
})
