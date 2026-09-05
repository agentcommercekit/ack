---
"@agentcommercekit/ack-pay": patch
---

Reject negative `decimals` in the Valibot payment option schema instead of clamping them to `0`.

`paymentOptionSchema` used `v.toMinValue(0)`, which silently rewrites negative values. That diverged from the Zod schema (`z.number().int().nonnegative()`) and could hide invalid payment precision. Switch to `v.minValue(0)` so both schemas reject the same inputs.
