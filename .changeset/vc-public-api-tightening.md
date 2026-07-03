---
"@agentcommercekit/vc": minor
---

Tighten two `@agentcommercekit/vc` public type signatures. These remove
unchecked casts and are breaking only for callers that passed explicit type
arguments:

- `parseJwtCredential` no longer accepts a `<T extends W3CCredential>` type
  parameter and now returns `Promise<Verifiable<W3CCredential>>`. The old
  generic was an unchecked cast — the function cannot prove a decoded credential
  matches an arbitrary `T`. Migration: drop the type argument and, if you need a
  narrower type, parse/validate the returned `Verifiable<W3CCredential>` against
  your own schema.
- `createCredential` now returns `W3CCredential` instead of the generic `T`. The
  `<T>` parameter still types `attestation`. Migration: if you relied on the
  narrowed return type, assert or parse the returned `W3CCredential` at the call
  site.
