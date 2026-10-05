---
"@agentcommercekit/ack-pay": patch
---

Bind the payment request token subject to its id during verification.

`createPaymentRequestToken` always sets `sub` to the payment request id, but
`verifyPaymentRequestToken` never checked that binding, so a validly signed
token could carry a different `sub` and still verify. Reject tokens whose JWT
`sub` does not match the parsed payment request id.
