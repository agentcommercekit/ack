---
"@agentcommercekit/ack-pay": patch
---

Reject empty payment request and payment option identifiers.

`paymentOptionSchema` accepted empty strings for `id`, `currency`, and `recipient`, and `paymentRequestSchema` / `paymentReceiptClaimSchema` accepted empty request and option ids. Require non-empty strings for these fields in both the Valibot and Zod schemas so HTTP 402 bodies and verified payment request tokens cannot carry blank identifiers.
