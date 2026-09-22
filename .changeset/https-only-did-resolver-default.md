---
"@agentcommercekit/did": minor
---

`getDidResolver()` now fetches did:web and did:jwks documents over `https` only
by default

When called without `webOptions`, `getDidResolver()` defaulted
`allowedHttpHosts` to `["localhost", "127.0.0.1", "0.0.0.0"]`, so a default
verifier sent plain `http://` requests to its own loopback while resolving an
attacker-chosen DID, for example `did:web:127.0.0.1%3A6379`, before any
signature check could reject the token. That contradicted the did:web
resolver's own documented `allowedHttpHosts` default of `[]`, and it only
applied when `webOptions` was omitted altogether (passing any other
`webOptions` already meant no plain-http hosts).

The default is now `[]`, matching the resolver. To resolve over plain `http`
for local development, opt in explicitly:

```ts
getDidResolver({ webOptions: { allowedHttpHosts: ["localhost"] } })
```
