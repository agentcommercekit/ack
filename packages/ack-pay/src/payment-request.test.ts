import { describe, expect, it } from "vitest"
import { isPaymentRequest } from "./payment-request"
import type { PaymentRequestInit } from "./payment-request"

describe("isPaymentRequest", () => {
  const validPaymentRequest: PaymentRequestInit = {
    id: "test-request-id",
    paymentOptions: [
      {
        id: "test-payment-option-id",
        amount: BigInt(100).toString(),
        decimals: 2,
        currency: "USD",
        recipient: "did:example:recipient"
      }
    ]
  }

  it("returns true for a valid payment request", () => {
    expect(isPaymentRequest(validPaymentRequest)).toBe(true)
  })

  it("returns false if the payment request is invalid", () => {
    expect(
      isPaymentRequest({
        ...validPaymentRequest,
        id: undefined
      })
    ).toBe(false)
  })

  it("returns false if given null", () => {
    expect(isPaymentRequest(null)).toBe(false)
  })

  it("returns false if given undefined", () => {
    expect(isPaymentRequest(undefined)).toBe(false)
  })

  it("returns false if given a non-object", () => {
    expect(isPaymentRequest(1)).toBe(false)
  })
})
