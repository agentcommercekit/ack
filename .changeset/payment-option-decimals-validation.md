---
"@agentcommercekit/ack-pay": minor
---

`paymentOptionSchema` now rejects a negative `decimals` instead of normalizing
it. The valibot schema used `toMinValue(0)`, which is a transformation that
clamps rather than a validation that rejects, so `decimals: -2` parsed
successfully as `decimals: 0`.

`decimals` scales `amount`, so clamping turned an invalid payment option into a
valid one asking for a different sum, and it did so on the verification path as
well: `verifyPaymentRequestToken` parses token payloads with this schema. The
zod schema already rejected the same input via `nonnegative()`, so the two
validators disagreed about which payment requests are well-formed.
