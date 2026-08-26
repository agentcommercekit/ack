---
"@agentcommercekit/ack-pay": patch
---

Reject invalid `expiresAt` values in `paymentRequestSchema` instead of throwing.

Previously the `expiresAt` transform called `new Date(input).toISOString()`
directly, so an unparseable value (e.g. `"invalid-date"`) threw a `RangeError`
out of `safeParse` rather than producing a validation error. The schema now
validates that the date is parseable before it normalizes the value to an ISO
string, and the valibot and zod schemas share the same accept/reject behavior.
