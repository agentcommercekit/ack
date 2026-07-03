---
"@agentcommercekit/ack-id": minor
"agentcommercekit": minor
---

Bump the `@a2a-js/sdk` peer dependency from `^0.2.2` to `^0.3.0`. The 0.3 line
reorganizes its entry points (server/client/express subpaths) and is not
backward compatible with 0.2, so consumers of `@agentcommercekit/ack-id`'s A2A
helpers must upgrade to `@a2a-js/sdk@^0.3.0`.
