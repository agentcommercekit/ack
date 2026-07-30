---
"@agentcommercekit/did": minor
---

Add a `timeout` option to `getResolver`'s `DidWebResolverOptions` for the
`did:web` resolver, defaulting to 5000ms. Resolving a `did:web` DID fetches
the host named in the DID, so an unresponsive or slow host could otherwise
hang the caller indefinitely. The resolver passes `AbortSignal.timeout(timeout)`
to the underlying fetch; a custom `fetch` must honour `init.signal` for the
timeout to take effect. Values outside 1..2147483647 (the 32-bit
timer limit) throw a `RangeError`: beyond it, runtimes either clamp the timer
to 1ms or throw at fetch time, both of which would surface as a misleading
`notFound`. There is no first-class opt-out; passing the maximum (about 24.8
days) effectively disables the timeout.
