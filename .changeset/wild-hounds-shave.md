---
"@agentcommercekit/did": minor
---

Refuse redirects when resolving did:web documents by default

`allowedHttpHosts` is checked against the URL built from the DID, but the
fetch followed redirects, so a redirect could move the request to a host or
scheme that check would have rejected. did:web documents are served directly
at a well-known path, so the resolver now sends `redirect: "manual"` and
refuses any redirect response with a precise error that names the redirect
target when the runtime exposes it (Node does; browsers surface an opaque
redirect without one). Set `followRedirects: true` to restore the previous
behavior.
