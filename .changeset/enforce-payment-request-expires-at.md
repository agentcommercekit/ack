---
"@agentcommercekit/ack-pay": patch
---

Set JWT `exp` from `paymentRequest.expiresAt` when issuing payment request tokens, and reject tokens whose `expiresAt` is in the past during verification (unless `verifyExpiry` is disabled).
