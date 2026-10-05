# Extension: Revocation Mechanisms (stub)

**Extracts v2 working draft sections 9.1 and 9.2.**

Core's revocation levers are short `exp`, single-use `jti`, agent key
removal, and owner-key unpinning. This extension defines the two
discoverable mechanisms for pulling back a still-valid grant by `jti`. It
also carries the issuer-side obligation: an issuer of grants that outlive its
RPs' acceptable exposure window MUST expose one of these mechanisms, and a
verifier implementing this extension MUST check it.

## Adds

- **Signed revocation list** (baseline): a short-lived JWT
  (`typ: "revocation-list+jwt"`) listing revoked `jti` values, `exp` on the
  order of minutes so staleness is legible, entries retained until the revoked
  artifact's own `exp` passes. Fully publicly auditable; no holder privacy.
- **Status list** (optional profile): the IETF OAuth Token Status List, JWT
  form only. Covered grants carry `status.status_list.uri` and `idx`, and
  name `status` in `crit` (core Section 5); the
  verifier fetches the whole list and reads the bit locally, so the issuer
  never learns which credential was checked. For issuers with many holders to
  protect; requires scale, randomized indexes, and decoys to deliver herd
  privacy. The W3C BitstringStatusList (JSON-LD) MUST NOT be used.
- **Revocation keys.** Both artifacts are signed by a dedicated
  revocation-purpose key, published in the DID document but excluded from
  assertion use, so a continuously online key can never mint grants.
  ext-controller's key-purpose segregation enforces the exclusion and is a
  declared dependency of that guarantee. A deployment running this
  extension without ext-controller enforces it at onboarding instead: a
  core RP MUST NOT pin an issuer's revocation key among that issuer's
  grant-signing keys.
- **Discovery.** Advertised via the `RevocationList` service entry in the DID
  document (ext-controller) or learned at onboarding (core).

## Registers

- Artifact type `revocation-list+jwt`.
- Grant claim `status` (per the IETF status list draft), always named in
  `crit`, so a status-bound grant is rejected by any verifier that cannot
  check its status (core Section 5).
