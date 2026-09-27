---
"@agentcommercekit/ack-id": patch
---

Return the freshly generated `replyNonce` from `createA2AHandshakeMessage` when responding to a handshake, so callers can correlate the next leg.
