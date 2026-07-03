---
"@agentcommercekit/did": major
"@agentcommercekit/jwt": major
"@agentcommercekit/vc": major
"@agentcommercekit/caip": major
"@agentcommercekit/ack-id": major
"@agentcommercekit/ack-pay": major
"agentcommercekit": major
---

Adopt [`web-identity-schemas`](https://github.com/catena-labs/web-identity-schemas)
as the source of truth for DID/JWT/VC validation schemas and DID/JWT types, and
**drop Zod v3 support**.

Breaking changes:

- **Zod v3 is no longer supported.** The `./schemas/zod/v3` and `./schemas/zod/v4`
  subpath exports are removed; each package now exports a single `./schemas/zod`
  (Zod v4). The `zod` optional peer range is now `^4.0.0`. Import from
  `@agentcommercekit/<pkg>/schemas/zod` instead of `.../schemas/zod/v3` or
  `.../schemas/zod/v4`.
- **DID validation is stricter.** `didUriSchema` and `isDidUri` now enforce the
  full DID-core syntax (via `web-identity-schemas`' `DidSchema`/`isDid`) instead of
  a permissive `startsWith("did:")` check. Malformed DIDs that previously passed
  are now rejected (and validation error details have changed).
- `DidUri` and `JwtString` are now re-exported from `web-identity-schemas` (`Did`
  and `JwtString` respectively). They remain structurally compatible; `JwtString`
  widens to `string`.
- **VC validation is stricter.** `credentialSchema` (and the `isCredential` guard
  built on it) is now backed by w-i-s' `CredentialV1Schema`, which enforces the VC
  Data Model v1.1 shape: the `@context` must start with the v1 core URI, `type`
  must include `"VerifiableCredential"`, `issuanceDate` must be an ISO-8601
  datetime, and `id` must be a URI. Loosely-shaped objects that the previous
  hand-rolled schema accepted may now be rejected. ACK-issued credentials (always
  v1) are unaffected, and the credential-verification path
  (`parseJwtCredential`/`verifyParsedCredential`) is unchanged — it still uses a
  separate structural guard, not this authoring schema.

`web-identity-schemas` is now a dependency of `did`, `jwt`, and `vc`. The VC
credential schema is now backed by w-i-s' `CredentialV1Schema` while preserving
ACK's issuer-normalization and `JwtProof2020` handling. CAIP, payment, A2A,
controller-claim, and `JwtProof2020` schemas remain hand-rolled.
