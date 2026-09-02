import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { paymentOptionSchema as valibotPaymentOptionSchema } from "./valibot"
import { paymentOptionSchema as zodPaymentOptionSchema } from "./zod"

function baseOption(decimals: number) {
  return {
    id: "opt-1",
    amount: 100,
    decimals,
    currency: "USD",
    recipient: "did:example:recipient",
  }
}

describe("paymentOptionSchema decimals", () => {
  it("valibot rejects a negative decimals value instead of clamping it to 0", () => {
    const result = v.safeParse(valibotPaymentOptionSchema, baseOption(-5))

    expect(result.success).toBe(false)
  })

  it("zod rejects a negative decimals value", () => {
    const result = zodPaymentOptionSchema.safeParse(baseOption(-5))

    expect(result.success).toBe(false)
  })

  it("valibot and zod agree: zero and positive decimals are valid", () => {
    for (const decimals of [0, 2, 18]) {
      expect(
        v.safeParse(valibotPaymentOptionSchema, baseOption(decimals)).success,
      ).toBe(true)
      expect(
        zodPaymentOptionSchema.safeParse(baseOption(decimals)).success,
      ).toBe(true)
    }
  })
})
