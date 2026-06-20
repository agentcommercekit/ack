---
"@agentcommercekit/keys": patch
---

Upgrade cryptographic dependencies to their latest majors (@noble/curves 2,
@solana/codecs-strings 6, multiformats 14, uint8arrays 6) and migrate the curve
modules to the @noble/curves v2 API. The public API of `@agentcommercekit/keys`
is unchanged.
