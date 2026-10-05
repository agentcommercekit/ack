---
"@agentcommercekit/ack-id": minor
---

Bind signed A2A messages to an intended recipient: `createSignedA2AMessage` accepts optional `recipient` and embeds it as JWT `aud`, and `verifyA2ASignedMessage` now passes `audience: did` to `verifyJwt` (matching the handshake path). Callers that verify with `did` should sign with `recipient` set; tokens without `aud` fail closed.
