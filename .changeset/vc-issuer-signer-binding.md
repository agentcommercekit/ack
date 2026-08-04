---
"@agentcommercekit/vc": patch
---

Security: bind a credential's issuer to the DID that signed it (CWE-290).

`parseJwtCredential` returned the credential `normalizeCredential` builds from
the JWT. That function derives the issuer as `{ id: iss, ...payload.issuer }`,
so an `issuer` object in the payload replaces the `id` taken from `iss`. The
signature binds `iss` only, and nothing compared the two.

Anyone could therefore sign a credential with their own key, put
`issuer: { id: "<any DID>" }` in the payload, and produce a credential that
verifies and reports that DID as its issuer. Every issuer check downstream
accepted it: the `trustedIssuers` list in `verifyParsedCredential`,
`trustedReceiptIssuers` in `verifyPaymentReceipt`, and the status list issuer
check in `isRevoked`. With `jti` set to the status list URL, the same forgery
also passed the URL binding on a status list credential and cleared a
revocation.

`parseJwtCredential` now rejects a credential whose `issuer.id` differs from the
verified signer, with `InvalidCredentialError`.

This covers the credential path only. `verifyPresentation` is re-exported from
did-jwt-vc unchanged, and `normalizeJwtPresentationPayload` sets `holder` from
`iss` only when the payload carries no `holder`, so a presentation can still
name a holder that did not sign it. That function also does not verify the
proofs of the credentials it embeds. Nothing in this repository calls it. Treat
its result as unverified until a bound wrapper replaces it.
