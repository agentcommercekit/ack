---
"@agentcommercekit/jwt": minor
---

Add an optional `requireAudience` to `verifyJwt`. `did-jwt` only validates the
`aud` claim when the token carries one, so a token that omits `aud` verifies
even when the caller supplies an `audience`, allowing cross-service replay.
Setting `requireAudience: true` rejects tokens with no audience. It defaults to
off, so existing behaviour is unchanged.
