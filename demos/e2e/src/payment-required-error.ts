import type { PaymentRequest } from "agentcommercekit"

/**
 * Custom error class for 402 Payment Required responses
 */
export class PaymentRequiredError extends Error {
  paymentRequest: PaymentRequest
  paymentRequestToken: string

  constructor(paymentRequest: PaymentRequest, paymentRequestToken: string) {
    super("402 Payment Required")
    this.name = "PaymentRequiredError"
    this.paymentRequest = paymentRequest
    this.paymentRequestToken = paymentRequestToken
  }
}
