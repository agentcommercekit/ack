---
"@agentcommercekit/ack-pay": patch
---

Validate that a PaymentReceipt's `paymentOptionId` matches an option offered by
the verified Payment Request token.

A receipt proves a `paymentRequestToken` and a selected `paymentOptionId`, but
verification did not bind that selection back to an option actually offered by
the request. `verifyPaymentReceipt` now rejects a receipt whose
`paymentOptionId` is not present in the verified request's `paymentOptions`. The
check reads from the proof-decoded credential, so it cannot be bypassed by
mutating the outer object on the parsed-credential input path.

Introduces `InvalidPaymentReceiptError` so callers can catch receipt-level
validation failures explicitly.
