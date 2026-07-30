---
"@agentcommercekit/did": minor
---

Add a `timeout` option to `getResolver`'s `DidWebResolverOptions` for the
`did:web` resolver, defaulting to 5000ms. Resolving a `did:web` DID fetches
the host named in the DID, so an unresponsive or slow host could otherwise
hang the caller indefinitely. The resolver passes `AbortSignal.timeout(timeout)`
to the underlying fetch; a custom `fetch` must honour `init.signal` for the
timeout to take effect. Invalid values (zero, negative, non-integer or
non-finite) throw a `RangeError`. There is no opt-out: every resolution now
carries a deadline.
