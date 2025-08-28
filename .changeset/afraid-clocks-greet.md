---
"agentcommercekit": minor
"@agentcommercekit/ack-pay": minor
---

- Deprecate `createPaymentRequestBody` in favor of `createSignedPaymentRequest`
- Rename `paymentToken` to `paymentRequestToken` in payment requests and receipts
- Remove `createPaymentRequestResponse`, which only built a `Response` object in a demo
