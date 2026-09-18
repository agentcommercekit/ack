---
"@agentcommercekit/vc": patch
---

Treat an unparseable Verifiable Credential `expirationDate` as expired in `isExpired`, instead of fail-open. Matches the fail-closed stance already used when checking status-list expiry.
