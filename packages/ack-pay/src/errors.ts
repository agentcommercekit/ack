export class InvalidPaymentRequestTokenError extends Error {
  constructor(message = "Invalid payment request token") {
    super(message)
    this.name = "InvalidPaymentRequestTokenError"
  }
}

export class InvalidPaymentReceiptError extends Error {
  constructor(message = "Invalid payment receipt") {
    super(message)
    this.name = "InvalidPaymentReceiptError"
  }
}
