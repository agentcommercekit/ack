---
"@agentcommercekit/vc": patch
---

Fix `isExpired` failing open on an unparseable `expirationDate`

`isExpired` returned `false` (not expired) whenever `credential.expirationDate`
was present but could not be parsed into a valid date. Since `isExpired` is
the check `verifyParsedCredential` uses to reject expired credentials, a
credential with a malformed or malicious `expirationDate` value was treated
as never-expiring instead of being rejected.

`isExpired` now fails closed: an unparseable `expirationDate` is treated as
expired, matching the safer default for a security-relevant check.
