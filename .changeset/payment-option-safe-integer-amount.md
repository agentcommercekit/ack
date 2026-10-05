---
"@agentcommercekit/ack-pay": patch
---

Reject unsafe integer numbers on the payment option amount number arm so valibot matches zod (and Number.isSafeInteger), keeping the string arm for amounts larger than the safe integer range.
