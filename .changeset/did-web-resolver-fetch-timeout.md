---
"@agentcommercekit/did": minor
---

Add an optional `timeout` to `getResolver`'s `DidWebResolverOptions` for the
`did:web` resolver. Resolving a `did:web` DID fetches the host named in the
DID, so an unresponsive or slow host could otherwise hang the caller
indefinitely. When set, the resolver passes `AbortSignal.timeout(timeout)` to
the underlying fetch. Omitting it keeps the previous behaviour (no timeout),
so this change is backward compatible.
