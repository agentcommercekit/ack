---
"@agentcommercekit/vc": patch
---

Validate the decoded credential shape in `parseJwtCredential` instead of relying
on an unchecked cast. `verifyCredential` (did-jwt-vc) returns its own credential
shape; `parseJwtCredential` now checks it conforms to `W3CCredential` via
`isCredential` and throws `InvalidCredentialError` on a divergent shape, rather
than silently casting it.
