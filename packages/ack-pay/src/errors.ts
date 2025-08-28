export class InvalidPaymentRequestTokenError extends Error {
  constructor(message = "Invalid payment request token") {
    super(message)
    this.name = "InvalidPaymentRequestTokenError"
  }
}
