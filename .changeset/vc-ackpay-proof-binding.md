---
"@agentcommercekit/vc": patch
"@agentcommercekit/ack-pay": patch
---

Security: bind credential trust decisions to the verified proof.

`verifyParsedCredential` previously verified the JWT in `proof.jwt` but then made
every trust decision (expiry, revocation, trusted-issuer, claim verifiers) from
the caller-supplied credential object, which is not bound to the proof. An
attacker could wrap a valid `proof.jwt` in an object with tampered `issuer` /
`credentialSubject` fields and pass verification. `verifyPaymentReceipt` had the
same gap on its object-input path, returning the tampered `paymentRequestToken`
and `receipt`.

`verifyProof` and `verifyParsedCredential` now return the credential decoded from
the verified proof, and all trust decisions and returned values flow from that
credential. The JWT-string input paths were already safe.
