---
"@agentcommercekit/jwt": patch
---

`createJwtSigner` now reports which curve it could not handle.

The `default` branch called `new Error("Unsupported algorithm", keypair.curve)`.
`Error`'s second argument is an `ErrorOptions` object (`{ cause }`), not a
message part, so passing a string there is silently dropped at runtime and
fails to type-check under `strict` TypeScript. The curve is now interpolated
into the message instead, so the thrown error actually names the unsupported
curve.
