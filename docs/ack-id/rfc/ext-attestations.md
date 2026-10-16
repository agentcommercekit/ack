# Extension: Attestations (stub)

**Extracts v2 working draft section 7.**

Third-party claims about an identity (KYB status, compliance level, audit
results), distinct from grants: an attestation asserts, a grant authorizes.

## Adds

- **Carriage.** JWTs (`typ: "jwt"`) or SD-JWTs (`typ: "dc+sd-jwt"`), issued by
  any party under its own keys, typed by issuer-controlled `vct` per SD-JWT
  VC. No central attestation-type registry.
- **Subject binding** (the one normative rule): the attestation issuer MUST
  verify, within its own session with the subject, that the subject controls
  the identity being named (a session-bound challenge signed by a current key
  of that identity). RPs SHOULD require issuers to document their binding
  procedure.
- **Selective disclosure.** SD-JWT only, and only here. Guidance: assert
  results ("verified at level 2") rather than raw attributes (a date of
  birth).
- **Freshness.** Attestations SHOULD include `cnf` (an RFC 7638 thumbprint
  of the subject key the issuer verified at binding time) or a log-head
  reference (ext-audit), so post-issuance key-set divergence is detectable.
  A verifier compares `cnf` against the key the subject proves possession
  of in the current interaction. It compares a log-head reference against
  the subject's current published head. A mismatch fails the attestation,
  never the session. Whether absent evidence downgrades or rejects is RP
  policy, declared in advance. Exact binding and failure semantics are a
  drafting requirement for this extension's normative text.
- **Request carriage.** The `Grant` field carries grants only: core
  Section 7 rejects any token in it whose `typ` is not `grant+jwt`, so an
  attestation has no slot in a signed request, and an RP that wants one at
  decision time would have to fetch it out of band. Drafting requirement:
  a request field for attestations with the same RFC 9651 List-of-Tokens
  grammar as `Grant`, covered by the request signature under the same
  coverage rule, each token evaluated independently under this extension.
  Core-only verifiers ignore the field. It carries evidence, never
  authority, so it needs no `crit` entry and opens no downgrade.
- **Subjects in delegation chains.** A behavioral attestation (a rating
  built from decision and settlement history) can never attach to an
  ephemeral did:key leaf (ext-delegation): the leaf has no history and is
  gone before it earns any. Drafting requirement: an attestation MAY name
  as `sub` any verified ancestor in the presented chain, typically the
  durable agent or owner behind the leaf. A verifier that has walked the
  chain accepts an attestation whose `sub` equals an ancestor's `sub`, with
  `cnf` compared against that ancestor's key rather than the leaf's.
- **Revocation.** An attestation is the artifact most likely to need
  pulling back inside its lifetime (a rating downgraded after an incident,
  a compliance status withdrawn). SD-JWT VC defines a `status` claim over
  the IETF Token Status List, the same list ext-revocation profiles for
  grants. A verifier implementing this extension MUST check `status` when
  present, mirroring ext-revocation's obligation.

## VC bridge (non-normative)

Semantically a grant is a verifiable credential: an issuer, a subject,
claims, validity, and proof. The mapping to the W3C VC data model is
mechanical and value-preserving: the table round-trips the data. It does
not carry core's enforcement semantics (exact-`aud` matching, `cnf`
possession, the `crit` rule, rejected unknown constraints), which is why it
is an adapter, never an equivalence:

| grant                         | VC data model               |
| ----------------------------- | --------------------------- |
| `iss`                         | `issuer`                    |
| `sub`                         | `credentialSubject.id`      |
| `aud`, `scope`, `constraints` | `credentialSubject` members |
| `iat` / `exp`                 | `validFrom` / `validUntil`  |
| `jti`                         | `id`                        |
| JWS signature                 | `proof`                     |

A gateway can wrap a grant as a `vc+jwt` for VC-consuming systems (or
translate a VC-shaped credential back into a grant) without losing data. This
extension is also where VC-formatted evidence enters ACK: an attestation MAY
be presented as a W3C VC and verified under this extension's rules. Wallet
and eIDAS ecosystems integrate here while core keeps zero VC dependencies.
The ideas survive in core; the encodings are adapters. A
normative adapter is a drafting requirement before any W3C VC is accepted
under this extension: claim-by-claim rules, rejection of unmappable claims,
and the accepted serializations (`vc+jwt`, `dc+sd-jwt`; no Data Integrity
proofs, matching core's JOSE-only posture).

## Registers

Nothing in the protocol `typ` registry, deliberately. Attestations are not
protocol artifacts: they ride the SD-JWT VC ecosystem's types (`typ: "jwt"`,
`typ: "dc+sd-jwt"`) and are typed by issuer-controlled `vct`, so existing
wallets and verifiers consume them unchanged. Core's distinct-`typ` rule
governs protocol artifacts only; an attestation can never be confused with a
grant because a grant MUST carry `typ: "grant+jwt"`.
