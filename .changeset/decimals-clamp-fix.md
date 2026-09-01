---
"@agentcommercekit/ack-pay": patch
---

Fix `paymentOptionSchema`'s `decimals` field silently clamping negative
values instead of rejecting them (valibot schema)

The valibot version of `paymentOptionSchema` used `v.toMinValue(0)` on the
`decimals` field, which is a **transform** that silently clamps a negative
number up to `0` rather than a validator that rejects it. This diverged from
the zod version of the same schema (`z.number().int().nonnegative()`), which
correctly rejects negative values.

Switched to `v.minValue(0)`, valibot's validating counterpart, so a payment
option with a malformed negative `decimals` value is now rejected by both
schema implementations instead of being silently "fixed" by the valibot one.
