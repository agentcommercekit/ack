# ACK-ID Extension: Controllers and Ownership (draft RFC)

**Status: proposal draft.** The key words MUST, MUST NOT, SHOULD, SHOULD NOT,
and MAY are to be interpreted as described in RFC 2119. Extracts v2 working
draft sections 3.1 (controllers), 4.2, 5, 6.3, and 8.3 steps 2, 4, 5.

## 1. Scope

Core authorizes agents whose owner the RP onboarded out of band. Identity
there is pinned keys plus a claims check. This extension serves the other
case: an agent presents, and the RP has never met its owner. The RP needs
to establish, offline and without a callback, who stands behind the agent.
This extension defines:

- the controller relationship, derived mechanically from the identity name,
- key purpose segregation within resolved DID documents,
- control grants (the issuer asserts it controls the subject),
- ownership proofs (binding an owner to an external anchor),
- the full verification checklist.

Together with core, this is the line back to the accountable entity: request
to agent key, agent to owner through the grant and the control grant,
owner to anchor through an ownership proof, anchor to legal entity through
the RP's own records. Core + this extension is the flagship pairing; a
deployment that never verifies unknown counterparties does not need it.

This document layers on core. Identities and key resolution (core Sections
3.1-3.2), keys and thumbprints (core Section 4), grants (core Section 5),
and signed requests (core Section 6) apply here without redefinition. One
core premise is replaced: core verifies grants against pinned owner keys,
while this extension verifies them against assertion keys resolved from the
issuer's DID document (Section 6). That substitution is what removes the
onboarding requirement.

## 2. Controllers

Each agent identity has exactly one **controller**, derived by an exact rule:
**the controller is the DID with the final path segment removed.** The
recursion grounds at the bare origin. Multi-level paths are legal and derive
recursively (`did:web:acme.com:teams:invoice-bot` is controlled by
`did:web:acme.com:teams`, which is controlled by `did:web:acme.com`);
one-segment identities derive the bare origin directly.

A bare origin can be an owner identity (a self-hosted deployment,
`did:web:acme.com`) or a hosted directory's apex serving many tenants. A
verifier never classifies it in advance; what verifies decides it. The
derivation names exactly one candidate controller per level. When a control
grant from the candidate verifies (Section 4), the candidate is the verified
controller. When none does (the directory-apex case, where the host never
asserts control of its tenants), the identity is a top-level owner: it has
no controller, and for consequential decisions it anchors directly through
ownership proofs (Section 5).

The agent's DID document `controller` property MUST equal the derived
controller; verifiers MUST reject a document that disagrees with the
derivation. Because the rule is mechanical and there is exactly one
legitimate control-grant issuer per agent (Section 4), two verifiers can
never disagree about who the controller is. Verifiers MUST key policy
decisions on the canonical DID, never on an origin or display string.

Derivation operates on path segments only, never on DNS labels. Every bare
origin, including a multi-label host such as
`did:web:agent.company.service.com`, is an apex: it has no derived
controller, and a control grant asserting control of a bare origin has no
legitimate issuer (Section 4) and MUST be rejected. A label-based rule is
deliberately not defined. It would need a stop boundary between
organizational labels and registry labels, which is the Public Suffix List.
That list is an external, continuously edited dependency: two verifiers
with different copies would derive different controllers, and the
never-disagree property above would be lost. DNS delegation also does not
reliably track organizational control: the platform operating `service.com`
controls every label beneath it, whoever a subdomain nominally belongs to.

A deployment that gives each agent its own subdomain therefore chooses
between two shapes. Treat each agent subdomain as a top-level owner in its
own right, pinned at onboarding (core) or anchored directly by ownership
proofs (Section 5), with no derived chain. Or name agents as path
identities under the company's host
(`did:web:company.service.com:agent-name`), which restores the mechanical
chain: the agent's controller is `did:web:company.service.com`, itself
anchorable to the company's own domain by an ownership proof. The identity
names where keys live (core Section 3.2), never where the agent serves
traffic. A platform can keep per-agent subdomains for routing while naming
identities as paths.

Core reads only `publicKeyJwk` entries from the DID document (core Section
3.2); this extension is what assigns the document's `controller` and
verification-relationship members their meaning and enforcement.

## 3. Key purpose

Keys are segregated by purpose through the DID document's verification
relationships, and verifiers implementing this extension MUST enforce the
segregation:

- **Assertion keys** appear in `assertionMethod`. Only these keys sign
  grants and proof claims.
- **Request keys** appear in `authentication`. They sign HTTP requests
  (core Section 6) and DPoP proofs (ext-web); typically the agent's key.
- **Revocation keys** (ext-revocation) appear in the DID document but MUST
  NOT appear in `assertionMethod`. They sign revocation artifacts and are
  expected to be online continuously; the exclusion is what keeps a hot key
  from minting grants.

Enforcement, from published documents: a verifier MUST reject a grant or
proof claim signed by a key outside the issuer's `assertionMethod`. It MUST
verify request signatures only against keys in the subject's
`authentication`. It MUST reject a revocation artifact whose signing key is
absent from the issuer's DID document or present in `assertionMethod`. In
core, where the RP pins exact keys and never reads verification
relationships, segregation reduces to core's existing rules: the pinned set
contains grant-signing keys only (core Section 7), and possession matches
`cnf.jkt` exactly.

Relationship entries resolve under a closed profile: `assertionMethod`,
`authentication`, and the revocation relationship carry fragment references
to the document's own top-level `verificationMethod` entries (the
`publicKeyJwk` entries core reads). Embedded verification methods inside a
relationship array, and references to anything outside the document, are
outside this profile and MUST be ignored. A reference with no matching
top-level entry is ignored the same way: the key is unavailable for that
purpose, and a dangling reference never widens what a key may do. Duplicate
`verificationMethod` ids make the document malformed (core Section 3.2).

## 4. Control grants

A control grant asserts the controller relationship as a verifiable
artifact: the issuer asserts it controls the subject.

Shape: a grant (core Section 5, `typ: "grant+jwt"`) with these
deviations from core's claim table, which this extension defines for the
`control` scope only:

| claim   | rule                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| `scope` | exactly the single token `control`; mixing with action scopes is rejected              |
| `iss`   | MUST equal the controller derived from `sub` (Section 2); any other issuer is rejected |
| `sub`   | the agent DID                                                                          |
| `aud`   | MUST be absent                                                                         |
| `cnf`   | OPTIONAL                                                                               |
| `exp`   | REQUIRED; SHOULD be at most 90 days, reissued before expiry                            |

It binds DIDs rather than keys, so key rotation invalidates nothing. The signature
MUST verify against a current assertion key of the derived controller
(Section 3). Because `iss` is derivable from `sub` by any verifier, there is
exactly one legitimate issuer, and a control grant from anyone else is
rejected regardless of signature validity.

The table is the complete set of overrides. A verifier recognizing the
`control` scope evaluates the artifact under core Section 5 with exactly
these deviations and no others: `typ`, the claim table, the `crit` rule,
time rules, lifetime bound, and `jti` uniqueness stand unchanged. Core's
owner-onboarding premise is replaced per Section 6: the signature verifies
against resolved assertion keys, never a pinned set. Possession is carried
by the leaf grants presented alongside, whose `cnf.jkt` core already
requires. The control grant's `sub` MUST equal the presenting agent's DID
(the `Signature-Agent` mapping, core Section 3.1), or the grant is ignored
for this presentation.

A verifier obtains the control grant from the presentation itself. An
agent operating under this extension presents it in the `Grant` field
alongside its leaf grants (core Section 6; each presented grant is
evaluated independently). It MAY additionally be published with the
subject's documents; publication location is deployment-defined. A lapsed
control grant means the ownership relationship no longer verifies
offline, and that state SHOULD be publicly legible wherever the identity is
rendered.

Control grants need no distinct `typ`, unlike ext-delegation's
intermediates: the `control` scope token is mandatory and reserved, so every
core-only verifier already rejects them unconditionally (core Section 5).

## 5. Ownership proofs

A proof binds an identity to an external anchor. It has two halves, and a
verifier checks both directly, without reference to any directory:

1. **The claim**: a JWS signed by a current assertion key of the identity,
   header `typ: "proof+jwt"`, payload naming the anchor:

   ```json
   {
     "iss": "did:web:acme.com",
     "type": "domain",
     "anchor": "acme.com",
     "iat": 1781035200,
     "jti": "prf_8fk2"
   }
   ```

2. **The anchor**: a record placed where only the anchor's owner could put
   it.

### 5.1 Domain anchor

Either of:

- DNS TXT at `_ack-id.<domain>`:

  ```
  _ack-id.acme.com.  TXT  "ack-id=did:web:acme.com;jkt=kWmvje3K..."
  ```

  The `jkt` pins a key, and the pinned key MUST be a current **assertion
  key** of the named identity; a pin naming a key outside `assertionMethod`
  makes the proof fail. A verifier that reads a pinned assertion key from
  DNS the counterparty controls, then verifies grants against that key,
  has verified the chain with no reference to any key directory. `jkt` MAY
  be omitted, but verifiers SHOULD prefer pinned anchors. Multiple `_ack-id`
  records are evaluated independently; a record naming a different identity
  MUST be surfaced, not silently ignored.

- HTTPS file `https://<domain>/.well-known/ack-id.json`, embedding the claim
  so the file is self-contained:

  ```json
  { "claims": ["<the compact claim JWS>"] }
  ```

### 5.2 Code-host anchor

A file committed where only the org could commit it. One exact location per
host, so two verifiers can never fetch different records. For GitHub: the
repository named `.ack-id` under the owner, file `ack-id.json` at the
repository root, read from the default branch through the host's raw
endpoint (`https://raw.githubusercontent.com/<owner>/.ack-id/HEAD/ack-id.json`).
Profiles for other hosts pin their equivalents. The shape is the same as
the well-known file, with `anchor` = `github:<owner>` or the host's
equivalent. The proof record MUST store the host's stable numeric owner ID
at creation. Verification MUST NOT follow rename or transfer redirects and
MUST treat an owner-ID mismatch as revoked. Verifiers SHOULD weight domain
anchors above code-host anchors: anyone with repository-creation rights in
an org can mint the latter.

### 5.3 Semantics

A proof asserts control of that anchor and nothing more. RP policy MUST
compare proven anchors against out-of-band expectations of the counterparty
(a contract, a merchant record, an allowlist) and MUST NOT treat the
identity's name string as evidence of anything.

Anchors MUST be re-checked periodically by whoever publishes proof status,
and a claim whose signing key is removed is dropped with it. Core's fetch
rules (SSRF checks on every hop, timeouts, size caps; core Section 3.2)
apply to every anchor fetch. Code-host anchor verification MUST NOT follow
rename or transfer redirects (5.2); that rule is this extension's, not
core's.

## 6. Full verification

In order, for consequential decisions or unknown counterparties:

1. **Possession**: as core Section 7 step 1, with request keys drawn from
   `authentication` only (Section 3).
2. **Canonical identity**: map the `Signature-Agent` URL to the agent's DID
   (core Section 3.1) and resolve its DID document; policy keys on the DID.
3. **Each leaf grant**: core Section 7 step 2, with one substitution: the
   signature verifies against a current assertion key of the issuer,
   resolved per core Section 3.2 and segregated per Section 3, rather than a
   pinned key. Where the issuer advertises a revocation mechanism
   (ext-revocation), its status for the `jti` MUST be checked; otherwise
   core's Section 8 posture (maximum acceptable lifetime) applies.
4. **Controller**: derive the controller (Section 2) and verify the
   subject's control grant (Section 4). If it is absent or expired there
   is no offline-verifiable owner; the RP fails or knowingly falls back to
   host-asserted data at its own risk.
5. **Proofs and policy**: verify the controller's ownership proofs
   (Section 5) and compare proven anchors against out-of-band expectations
   (5.3). The chain holds only when the leaf grant's issuer is the
   verified controller (or chains to it, ext-delegation); an action grant
   not linked to the controller is third-party authorization the RP's policy
   must independently accept.

What a passing verification proves: continuity of key control, the control
relationship, and control of the proven anchors. The step from anchor to
legal entity belongs to the RP's records (the contract or merchant record
that names the domain), never to the protocol. It still never proves human
presence or consent.

## 7. Interaction with core

A core-only verifier rejects every artifact this extension defines: control
grants fall to core's reserved scope token, and a proof claim presented as
a grant falls to core's `typ` check (`proof+jwt` is not `grant+jwt`).
There is no downgrade path. The two verification modes compose: an RP MAY
run core verification for onboarded owners and full verification for
unknown ones; nothing in this extension changes the meaning of a core
verification that passes.

## 8. Security considerations

- **Name-derived control.** The controller relationship is derived from the
  name, and whoever controls the origin serving the documents can publish
  keys for every identity under it. The derivation rule makes this legible;
  it does not remove it. Where that concentration matters, pin keys instead
  of locations: a DNS `jkt` pin (5.1) verifies the chain with no reference
  to the serving origin's key documents.
- **Display strings.** Names prove nothing (5.3). Any UI that renders an
  identity SHOULD use its proven anchors as the trust signal, never its
  name string. Lookalike names over unproven anchors are the expected
  phishing shape.
- **Anchor fetching.** Server-side anchor fetching is an SSRF surface; core
  Section 3.2 rules apply. DNS SHOULD be queried from multiple vantage
  points and DNSSEC validated where present.
- **Code-host anchors.** Weight below domain anchors (5.2); repository
  creation is a much weaker capability than DNS control.
- **Lapsed control grants.** A lapsed control grant is a silent
  downgrade from verified ownership to host-asserted data. RPs SHOULD treat
  it as a state change rather than a steady state (Section 4).

## Registers

- Scope token `control`, with the Section 4 claim table.
- Artifact type `proof+jwt`.
