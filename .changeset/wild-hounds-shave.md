---
"@agentcommercekit/did": minor
---

Refuse redirects when resolving did:web and did:jwks documents by default

`allowedHttpHosts` is checked against the URL built from the DID, but the
fetch followed redirects, so a redirect could move the request to a host or
scheme that check would have rejected. DID documents are served directly at
a well-known path, so the resolvers now send `redirect: "manual"`. The
did:web resolver refuses any redirect response with a precise error that
names the redirect target when the runtime exposes it (Node does; browsers
surface an opaque redirect without one); a redirected did:jwks resolution
fails as `notFound`. Set `followRedirects: true` to restore the previous
behavior.
