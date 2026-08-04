---
"@agentcommercekit/jwt": minor
"@agentcommercekit/ack-id": patch
---

`verifyJwt` now fails when an `audience` is supplied and the token carries no
non-empty `aud` claim, matching jose and PyJWT semantics. `did-jwt` only
validates `aud` when the token carries one, so previously a token that omitted
`aud` verified even when the caller expected an audience, allowing
cross-service replay. There is no flag: supplying `audience` is the signal.
Callers that accept audience-less tokens should omit the `audience` option.

`verifyA2ASignedMessage` no longer passes `audience` to `verifyJwt`: signed
A2A messages do not carry an `aud` claim, so the option never provided any
check there. The handshake flow is unchanged and still verifies `aud`.
