export class InvalidPaymentRequestTokenError extends Error {
  constructor(
    message = "Invalid payment request token",
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "InvalidPaymentRequestTokenError"
  }
}

export class InvalidPaymentReceiptError extends Error {
  constructor(message = "Invalid payment receipt", options?: ErrorOptions) {
    super(message, options)
    this.name = "InvalidPaymentReceiptError"
  }
}
