---
"@agentcommercekit/vc": patch
---

Bind credential verification to the signed proof. `verifyProof()` now returns the credential decoded from `proof.jwt`, and `verifyParsedCredential()` runs every downstream check (expiry, revocation, trusted issuer, and claim verifiers) against that verified credential rather than the caller-supplied object. It also now returns the verified credential, so consumers can read signed fields from the return value instead of the object they passed in. On the parsed-credential input path a caller could previously attach a valid `proof.jwt` while mutating the outer `credentialSubject`, `issuer`, etc.; those fields were trusted directly. Now they are ignored in favor of the signed payload. Fixes #105 and #108.
