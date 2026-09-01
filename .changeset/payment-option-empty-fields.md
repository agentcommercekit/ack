---
"@agentcommercekit/ack-pay": patch
---

Reject empty payment request and payment option identifiers.

`paymentOptionSchema` accepted empty strings for `id`, `currency`, and
`recipient`, and `paymentRequestSchema` accepted an empty request `id`, even
though other fields such as `amount` already reject invalid values. Require a
non-empty string for these fields in both the valibot and zod schemas.
