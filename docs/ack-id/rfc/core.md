# ACK-ID Core (draft RFC)

**Status: proposal draft.** The key words MUST, MUST NOT, SHOULD, SHOULD NOT,
and MAY are to be interpreted as described in RFC 2119.

## 1. Scope

ACK-ID Core defines how an agent proves who it is and what it may do. The
proof is cryptographic and needs no callbacks. In core, the relying party
already knows and trusts the owner that authorized the agent. Core defines:

- identities and key resolution,
- keys and thumbprints,
- the grant artifact,
- the signed-request carriage (Web Bot Auth compatible),
- the verification checklist,
- the revocation levers,
- the extension mechanism.

All other topics live in extension documents layered on this one: ownership
discovery for unknown counterparties, delegation chains, revocation lists,
the OAuth surface, attestations, and audit logs. A core-only deployment is
complete and useful on its own. Example: an organization that authenticates
its own agents to its own services. To serve unknown counterparties, and to
trace a request back to an accountable entity, pair core with
ext-controller.

### 1.1 How it works

Three parties. An **owner** (Acme) is accountable for an **agent** (Acme's
invoice bot). A **relying party** (the API the bot calls) accepts the
agent's requests because the owner authorized them.

Two keypairs:

- The agent holds a keypair and publishes the public key in one JSON
  document at its identity URL (Section 3).
- The owner holds a keypair and gives the public key to the relying party
  once, at onboarding (Section 2).

The flow:

1. The owner signs a **grant**: a short-lived JWT saying this agent may
   perform these actions at this relying party (Section 5).
2. The agent signs each HTTP request with its own key (RFC 9421) and
   attaches the grant in the `Grant` field (Section 6).
3. The relying party verifies the request signature against the agent's
   published keys (one HTTPS fetch). It verifies the grant against the
   owner key it pinned at onboarding. It then checks that the grant's scope
   covers the request (Section 7).

Nobody calls anybody back. The owner can be offline. The agent proves
possession of its key on every request. The relying party verifies
everything locally except the one fetch of the agent's published keys.

Every artifact verifies with a stock JOSE library. Conversion between an
identity's two spellings (Section 3.1) is string manipulation.

## 2. Terminology

- **Relying party (RP)**: the service an agent calls. It verifies what the
  agent presents. This document says **verifier** when a rule also applies
  to parties that are not the target of a request (for example, an auditor
  who walks an ACK-Pay receipt trail).
- **Owner**: the accountable party behind an agent. In core, the RP knows
  the owner out of band and pins its keys at onboarding.
- **Agent**: software acting under an owner's authority.
- **Identity**: an owner or agent, named by its HTTPS **identity URL** and
  spelled as a did:web DID in artifacts (Section 3).
- **Grant**: a JWT in which an issuer gives a subject bounded authority to
  act (Section 5).
- **Artifact**: any signed object this protocol defines. In core: grants
  and signed requests.
- **Onboarding**: the out-of-band step in which an RP learns an owner's
  grant-signing public keys and records (**pins**) them against the
  owner's identity. The channel belongs to the RP: a business agreement, a
  dashboard, a config file. Core requires only that the channel exists and
  supports unpinning (Section 8).

## 3. Identity and key resolution

### 3.1 Identities

An identity has two equivalent spellings:

- the **identity URL**: `https://acme.com` for an owner,
  `https://acme.com/invoice-bot` for an agent. The URL is where the
  identity's keys are published (Section 3.2).
- the **did:web DID**: `did:web:acme.com`, `did:web:acme.com:invoice-bot`.
  This spelling appears inside grants, as `iss` and `sub`.

Conversion between the two is string manipulation: take the host, then the
path segments, and join them with `:` in the DID spelling. The mapping
works in both directions and gives exactly one result each way. One
identity, two spellings, each used only where this document says so. The
DID spelling exists for compatibility with adjacent layers that name
signers as DIDs; the x402 offer-receipt extension resolves its signers'
keys from the same document Section 3.2 defines. The URL spelling appears
where an external spec requires a URL (`Signature-Agent`, per Web Bot
Auth, Section 6).

A host may carry any number of DNS labels:
`https://agent.company.service.com` is a legal root identity, spelled
`did:web:agent.company.service.com`, with keys resolved per Section 3.2
rule 2. Host labels carry no relationship: core treats identities on
different hosts as unrelated, whatever labels they share. The
agent-to-owner binding is the grant (Section 5), and its `iss` may name an
owner on any host the RP has onboarded. Controller derivation
(ext-controller) operates on path segments only, never on host labels. A
deployment that must choose between subdomain-per-agent and path-per-agent
layouts should read that document's Section 2.

Before a verifier uses an identity for comparison or URL construction, it
MUST reject the identity if its URL form contains any of: a userinfo
component, a port, a query, a fragment, a trailing slash, a dot-segment
(`.` or `..`), an empty path segment, percent-encoding, or `.well-known`
as its first path segment. The `.well-known` rule closes an aliasing hole.
The path identity `https://acme.com/.well-known` would publish its keys at
`https://acme.com/.well-known/did.json`. That is the same location that
serves the root identity `https://acme.com`, so one document would answer
for two identities. To compare two identities, a verifier MUST map both to
one spelling, lowercase the host (and the scheme, in the URL form), and
compare byte-for-byte. No other normalization is defined.

### 3.2 Key resolution

Given an identity, a verifier resolves its current public keys from its
**DID document**, fetched from exactly one location (the did:web resolution
rule):

1. **Path identities** (URL form has a path): `<identity URL>/did.json`.
2. **Root identities** (bare origin): `https://<host>/.well-known/did.json`.

A verifier reads exactly one thing from the document: the key set. A key is
a `verificationMethod` entry whose `publicKeyJwk` member carries a JWK (RFC
7517). Core ignores every other member (`controller`, service endpoints,
non-JWK key encodings); ext-controller assigns them meaning. A document
with no parseable `publicKeyJwk` entries is malformed.

A missing or malformed document ends resolution with failure. There is no
fallback location. That strictness is what makes key removal a revocation
lever (Section 8): a resolver that tried another location on 404 would
quietly widen a key set its publisher deleted. Orgs whose keys live behind
an OIDC `jwks_uri` use the opt-in discovery profile in ext-web.

Non-normative: the same document serves the x402 offer-receipt extension's
JWS key discovery, which resolves did:web signers from `did.json`. One
hosted document covers ACK-ID verification and ACK-Pay artifact
verification.

Resolution rules:

- All fetches MUST use HTTPS, MUST time out, and MUST cap response size.
  Fetchers MAY follow redirects to a bounded depth (RECOMMENDED limit 3).
  Every hop MUST use HTTPS and MUST pass the address checks below.
- The identity URL is attacker-influenced until a signature verifies.
  Fetchers MUST NOT connect to loopback, private (RFC 1918), link-local,
  or unique-local addresses, on any hop. Deployments that face hostile
  input SHOULD resolve DNS once and pin the address for the connection.
- Key currency is judged against a fresh read of the document. A verifier
  MUST NOT use a read older than 300 seconds and SHOULD cache no longer
  than 60. Publishers MUST serve the document with cache lifetimes of 60
  seconds or less. Removal of an agent key from the DID document then
  invalidates everything that key signs within the cache bound: at most
  300 seconds. (Owner keys are pinned, not resolved; their lever is
  unpinning, Section 8.)

## 4. Keys

- **Algorithms.** A verifier MUST accept both `EdDSA` (Ed25519,
  `kty: "OKP"`, `crv: "Ed25519"`) and `ES256` (P-256, `kty: "EC"`,
  `crv: "P-256"`), and MUST reject any other `alg`. A verifier MUST select
  the verification key by `kid` and MUST confirm the selected key's
  `kty`/`crv` matches the asserted `alg`. Keys outside this set MUST be
  ignored: a co-hosted DID document may carry RSA keys for other
  protocols, and they play no part here. Issuers SHOULD issue Ed25519 by
  default; P-256 exists for hardware-backed and FIPS-constrained keys.
- **Custody.** Private keys are generated by the holder and MUST NOT be
  transmitted to any server. The owner's key signs grants; each agent's key
  signs that agent's requests. Owner keys SHOULD NOT live on the machines
  running the agents they authorize.
- **Rotation.** An identity holds one or more keys. Rotation is
  add-then-remove and MUST NOT change the identity.

### 4.1 Thumbprints

Keys are named by their RFC 7638 JWK thumbprint, base64url encoded
(computed per RFC 8037 for Ed25519). The thumbprint is the published key's
name everywhere: the JWK `kid`, the `verificationMethod` fragment, the
HTTP signature `keyid`, and the grant `cnf.jkt`. Lookup is by recomputed
thumbprint. Given a `kid` or `keyid`, the verifier selects the resolved
entry whose recomputed RFC 7638 thumbprint equals it. A stated JWK `kid`
or fragment is a label, never the selector, so a published entry cannot
claim another key's name. Exactly one entry may match. Zero matches, or
more than one, is a rejection.

## 5. Grants

A grant is a JWT: header `alg` per Section 4, `typ: "grant+jwt"`, `kid` the
issuer key's thumbprint. Verifiers MUST reject a grant whose `typ` differs.

```json
{
  "iss": "did:web:acme.com",
  "sub": "did:web:acme.com:invoice-bot",
  "aud": "https://api.examplebank.com",
  "scope": "invoices:read",
  "constraints": { "region": "us" },
  "iat": 1781035200,
  "exp": 1781121600,
  "jti": "grn_4kq8",
  "cnf": { "jkt": "tH5Qw9..." }
}
```

The example is non-normative; the recognized claims and their requiredness
are:

| claim         | requiredness | rule                              |
| ------------- | ------------ | --------------------------------- |
| `iss`         | REQUIRED     | DID of an onboarded owner         |
| `sub`         | REQUIRED     | DID of the agent                  |
| `aud`         | REQUIRED     | single string, exact match        |
| `scope`       | REQUIRED     | space-delimited action scopes     |
| `iat`, `exp`  | REQUIRED     | numeric; time rules below         |
| `jti`         | REQUIRED     | unique per issuer                 |
| `cnf`         | REQUIRED     | `jkt` possession pin              |
| `constraints` | OPTIONAL     | open object; members only narrow  |
| `nbf`         | OPTIONAL     | numeric; time rules below         |
| `crit`        | OPTIONAL     | critical claim names; rules below |

**Unknown claims are ignored; `crit` names the ones that must not be.** A
verifier ignores any top-level claim it does not recognize. A claim that
changes what the grant means MUST be named in `crit` by its issuer. A
verifier MUST reject a grant whose `crit` names a claim the verifier does
not implement and evaluate. This is the RFC 7515 `crit` pattern, applied
to payload claims, and it is the extension mechanism. A claim like `chain`
(ext-delegation) or `status` (ext-revocation) rides under `crit`, so a
verifier that cannot evaluate it rejects the grant. `crit`, when present,
MUST be a non-empty array of unique strings. It MUST NOT name any claim in
the table above, and MUST NOT name a claim absent from the payload. A
violation of any of these rules is a rejection.

- `iss` and `sub` are DIDs (Section 3.1). `iss` MUST name an owner the RP
  has onboarded (Section 2). The grant MUST verify against a key pinned
  for exactly that owner (Section 7).
- `aud` MUST be a single string exactly matching an identifier the RP
  recognizes as its own. (Extensions define artifacts with other `aud`
  shapes; core verifiers never accept those artifacts, by the rules above.)
- `scope` is space-delimited. Every token is an action scope whose meaning
  is owned by the audience, wildcard grammars included. The tokens
  `control` and `register` are reserved for extensions (ext-controller and
  ext-delegation define them). A core verifier MUST reject a grant that
  carries either.
- `constraints` is an object of audience-defined members. A member only
  ever narrows what the grant allows: `{"region": "us"}` grants less than
  no constraint at all. Because members only narrow, a verifier MUST
  reject a grant that carries a member the verifier does not understand;
  to skip one would widen the grant. This document assigns no meaning to
  any member. Data that does not narrow authority does not belong in a
  grant.
- Time rules, with a clock-skew allowance `skew` (RECOMMENDED 60 seconds)
  applied uniformly: `iat <= now + skew`; `nbf <= now + skew` when
  present; `exp > now - skew`; `exp > iat`; and `exp > nbf` when `nbf` is
  present. The last two compare issuer-set values against each other, so
  no skew applies: an empty validity interval makes the grant malformed.
  A malformed or non-numeric time claim is a rejection. (`nbf` is
  recognized because some JOSE libraries add it by default.)
- `jti` MUST be unique per issuer, with enough entropy that revocation and
  single-use tracking by `jti` are well defined.
- `cnf.jkt` pins the key that must prove possession at presentation. A
  grant without it would be a bearer artifact, and core has no bearer
  artifacts. Verifiers MUST reject a grant that lacks `cnf.jkt`. Verifiers
  MUST match `cnf.jkt` against the possession key exactly, never against
  "any current key of the subject."

## 6. Signed requests

Agents sign requests with RFC 9421 HTTP message signatures. The profile
stays within what Web Bot Auth infrastructure verifies as deployed today,
so one signature serves ACK-ID verifiers and WBA edges alike. The parts
have three sources. RFC 9421 defines the signature itself and carries no
credential. `Signature-Agent` comes from Web Bot Auth. The `Grant` field
is defined by this document.

- The signature MUST cover `@method`, `@target-uri`, `content-digest` when a
  body is present, the `Signature-Agent` field, and the `Grant` field with
  the `sf` parameter when grants are presented.
- `Signature-Agent` carries the agent's identity URL (the URL spelling of
  its DID, Section 3.1; Web Bot Auth requires a URL here). It is an
  untrusted hint until the signature verifies. Because it is under the
  signature, a middlebox cannot swap it.
- `keyid` is the signing key's thumbprint. `created` (and `expires` where
  used) bound replay. Verifiers MUST enforce a maximum `created` age
  (RECOMMENDED default 300 seconds); the maximum is the RP's
  replay-exposure ceiling, a policy choice like the Section 8 lifetime
  maximum. When `expires` is present, it MUST be covered by the signature,
  and a verifier MUST reject a request past it (the Section 5 `skew`
  applies). `expires` only ever narrows the window: an `expires` beyond
  the maximum `created` age does not extend acceptance. A captured request
  replays verbatim within that window. RPs that accept non-idempotent
  requests MUST therefore enforce replay protection: a cache over the
  signature value, or the RFC 9421 `nonce` parameter.
- `Grant` is a structured-field List of Tokens (RFC 9651), one token per
  compact JWT. (An RFC 9651 Token must begin with an alphabetic character
  or `*`. A compact JWT's first segment is base64url of a JSON header and
  always begins `eyJ`, so grants satisfy the grammar.) A verifier MUST
  reject a request whose `Grant` field fails structured-field parsing; it
  MUST NOT salvage tokens from it. An unsigned `Grant` field is open to
  middlebox changes. Coverage is what binds the grants to the request, and
  a verifier MUST check that coverage, never assume it.
- Each presented grant is evaluated independently; the request is authorized
  only by grants that individually pass.

Non-normative: a Web Bot Auth edge (for example, a CDN verifying crawler
signatures) discovers keys per its own draft, at
`/.well-known/http-message-signatures-directory` on the `Signature-Agent`
origin, not via Section 3.2. An agent that wants those edges to recognize
it also hosts that directory; see ext-web. The signature itself is the
same either way.

## 7. Verification

The RP holds the owner's grant-signing public keys, pinned at onboarding
(Section 2). The pinned set MUST contain grant-signing keys only; never,
for example, an issuer's continuously online revocation key
(ext-revocation). Three checks authorize a request. The only document
fetch is the resolution of the agent's keys per Section 3.2.

1. **Possession**: verify the request signature (Section 6) against the
   agent's keys, resolved fresh per Section 3.2 from the `Signature-Agent`
   identity URL, with the Section 4.1 thumbprint check against `keyid`.
2. **Grant**, all of:
   - `typ` is `grant+jwt`.
   - The signature verifies against a key pinned for the owner named in
     `iss`. Never merely "some pinned key": an RP with more than one
     onboarded owner binds `iss` to the pinning entry, which stops one
     owner minting grants attributed to another.
   - `sub` equals the requesting agent's DID, mapped from the
     `Signature-Agent` URL per Section 3.1.
   - `aud` matches the RP exactly.
   - The Section 5 claim table, `crit` rule, and time rules pass.
   - The lifetime `exp - iat` does not exceed the RP's maximum (Section 8).
   - No reserved scope tokens are present.
   - `cnf.jkt` equals the possession key thumbprint.
   - Every `constraints` member is understood and satisfied.
   - The RP's Section 8 revocation posture holds.
3. **Scope**: the grant's scope covers the requested action.

Pinning is core's stance, and it is also core's boundary. An RP that must
verify owners it never onboarded resolves issuer keys instead of pinning
them; that is ext-controller's Section 6. Nothing else in the checklist
changes.

A passing verification proves continuity of key control and authorization.
It never proves human presence, consent, or the legal identity behind a
domain.

## 8. Revocation

Core's revocation story is complete against agent-key and grant
compromise. It consists of these levers; the list mechanisms live in
ext-revocation.

- **Short `exp` is the primary mechanism.** Grant lifetimes SHOULD be
  short (minutes to days). An `exp` on the order of minutes bounds
  exposure with no revocation check at all.
- **Single-use grants.** For one-shot authority, the RP records the `jti`
  at first acceptance and rejects reuse; the grant is spent when used.
  Which actions need single-use authority is the RP's call (a payment
  authorization, a one-shot registration); core supplies the mechanism.
  Redemption MUST be atomic: a check-and-set keyed by (`iss`, `jti`). A
  separate read-then-write lets two concurrent presentations both pass.
  The RP keeps the record until the grant's `exp` has passed.
- **Key removal.** Removing an agent's keys from its DID document
  invalidates everything the agent signs within the cache bound (Section
  3.2).
- **Owner-key unpinning.** Pinned owner keys are established out of band
  at onboarding, and they are revoked the same way. RPs MUST support
  unpinning a compromised owner key through the onboarding channel.
  Unpinning invalidates every grant that key signed.

A core RP MUST define a maximum acceptable grant lifetime, as a duration.
It MUST reject any grant whose lifetime `exp - iat` exceeds it; the
Section 7 checklist enforces this. Because acceptance also requires
`iat <= now + skew`, the same bound caps remaining validity at acceptance.
The maximum is the RP's exposure ceiling. An RP that needs to accept
longer lifetimes implements ext-revocation and learns the issuer's
mechanism at onboarding. There is no middle state in which a revoked,
unexpired grant is knowingly accepted.

One consequence to weigh openly: core has no delegation, so an owner key
signs every grant, and minute-scale lifetimes keep that key signing
continuously. A core-only deployment therefore chooses between an online
owner key and longer grant lifetimes. ext-delegation resolves the tension:
the owner signs one medium-lived intermediate offline, and a hot service
mints the short-lived leaves.

## 9. Extension mechanism

Extensions add capability without weakening a core-only verifier, through
three surfaces:

- **Critical claims.** An extension that changes what a grant means
  defines a claim (`chain`, `status`) and requires issuers to name it in
  `crit` (Section 5). Verifiers that implement the extension evaluate the
  claim; every other verifier rejects the grant. A claim that is safe to
  ignore is carried without a `crit` entry, and verifiers ignore it.
- **Constraints and scopes.** Narrowing semantics ship as `constraints`
  members: an unrecognized member is a rejection (Section 5), so a
  restriction is never skipped. Granting semantics ship as scope tokens:
  an unrecognized token authorizes nothing, because no requested action
  matches it. An extension MUST NOT ship narrowing semantics as scope
  tokens. The reserved tokens `control` and `register` are rejected by
  core verifiers until the defining extension is implemented.
- **Artifact types.** Every protocol artifact carries a distinct JOSE
  `typ`. Verifiers MUST reject an artifact whose `typ` does not match its
  context. The registry is this table plus each extension's "Registers"
  section, governed with this specification. No external registry is
  consulted at verification time. (Attestations are third-party artifacts
  outside this registry by design; see ext-attestations.)

  | `typ`       | artifact           | defined by |
  | ----------- | ------------------ | ---------- |
  | `grant+jwt` | grants (Section 5) | core       |

  Non-normative: signing tooling should not expose generic sign-anything
  operations for protocol `typ` values. Mint a `typ` only through tooling
  that enforces its artifact rules; that is what keeps one keypair safe
  across every use.

An RP MAY advertise accepted extensions, audience identifier, and required
scopes in a well-known discovery document (ext-web); core assigns it no
location or schema. An implementation states which extensions it supports.
There are no numbered conformance levels.

## 10. Security considerations

- **Key custody.** The machine holding a key is the trust boundary. A
  pinned owner key co-located with its agents reduces every grant to
  self-issuance.
- **Replay.** Signed requests carry bounded `created` windows, and
  non-idempotent requests require a replay cache or nonce (Section 6).
  Grants carry `exp` and `jti`; single-use redemption is `jti`
  replay-checking.
- **Header integrity.** Unsigned `Grant` and `Signature-Agent` fields are
  strippable and substitutable. Coverage (Section 6) is mandatory. A
  verifier MUST verify the coverage, never assume it.
- **Key resolution SSRF.** Section 3.2 fetches an attacker-influenced URL.
  Apply the stated protections to every fetch and every redirect hop.
- **Critical claims.** The `crit` rule rests on issuers naming every claim
  that changes a grant's meaning. A meaning-changing claim omitted from
  `crit` is ignored by verifiers without the extension. Extensions
  therefore also give their artifacts a second rejection surface where
  ignoring a claim would widen authority: a distinct `typ`, a reserved
  scope token, or an `aud` shape core rejects.
- **Redirected key fetches.** Key resolution follows redirects (Section
  3.2), so whoever can set a redirect at the identity's origin chooses
  where keys are read from. Publishers SHOULD serve `did.json` directly.
  An RP MAY refuse redirected resolution where its policy needs the
  stronger property.
- **Shared key sets.** A key set shared across identities (a root
  identity's `/.well-known/did.json` serving a whole org) weakens what a
  request signature proves. A passing signature proves possession of some
  key in that set, never which party holds it. Any key-holder in the set
  can pass Section 7 step 1 for any identity the set serves.
  `Signature-Agent` MUST NOT be treated as authenticated identity on its
  own; the `cnf`-bound grant identifies the agent. Publishers SHOULD serve
  per-agent key sets, at path identities or per-agent hosts, where
  isolation matters.
- **Privacy.** Verification is callback-free: credential use does not
  reveal itself to issuers. Published DID documents are public; put no
  personal data in identities or key metadata.
