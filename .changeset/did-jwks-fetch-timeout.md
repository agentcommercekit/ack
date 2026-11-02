---
"@agentcommercekit/did": patch
---

`getDidResolver()` now applies the `webOptions.timeout` (default 5000ms) to the
fetches it makes when resolving a `did:jwks` DID. #129 added the timeout to the
`did:web` resolver, but the `did:jwks` resolver gets its own `fetch` wrapper,
which passed no `AbortSignal`. Resolving a `did:jwks` DID fetches the host
named in the DID, so a host that accepted the connection and never answered
held the resolution, and every JWT, credential or receipt verification waiting
on it, open with no bound from this library. Each of the up to three requests a
`did:jwks` resolution makes (the JWKS, the OpenID configuration and its
`jwks_uri`) is now aborted after the timeout, and the resolution reports an
error. A custom `fetch` must honour `init.signal` for the timeout to take
effect. A timed-out `did:jwks` resolution is reported as `notFound`, like a `did:web` timeout, so it is not kept in the resolver cache when `cache: true` is set.
