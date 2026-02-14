---
"@agentcommercekit/did": patch
---

Fix `did:web` resolution URL construction to follow the spec:

- Keep root identifiers at `/.well-known/did.json` (for example, `did:web:example.com`)
- Resolve path-based identifiers to `/:path/did.json` (for example, `did:web:example.com:abc`)

Also adds regression tests for path-based resolution, including `allowedHttpHosts`.
