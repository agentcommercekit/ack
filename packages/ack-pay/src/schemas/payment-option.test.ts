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

describe("paymentOptionSchema network", () => {
  it("accepts omitted network", () => {
    const value = { ...paymentOption, amount: 1 }
    expect(v.safeParse(valibotPaymentOptionSchema, value).success).toBe(true)
    expect(zodPaymentOptionSchema.safeParse(value).success).toBe(true)
  })

  it("accepts non-empty network", () => {
    const value = { ...paymentOption, amount: 1, network: "eip155:84532" }
    expect(v.safeParse(valibotPaymentOptionSchema, value).success).toBe(true)
    expect(zodPaymentOptionSchema.safeParse(value).success).toBe(true)
  })

  it("rejects empty network", () => {
    const value = { ...paymentOption, amount: 1, network: "" }
    expect(v.safeParse(valibotPaymentOptionSchema, value).success).toBe(false)
    expect(zodPaymentOptionSchema.safeParse(value).success).toBe(false)
  })
})
