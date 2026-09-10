# Extension: Delegation Chains (stub)

**Extracts v2 working draft sections 6.2, 6.4, and 6.5, plus the did:key
portion of 3.1.**

Core grants are direct: owner signs, agent presents. This extension adds
re-delegation with normative attenuation. That is what lets owner keys stay
offline while short-lived grants are minted continuously. It is also where
the ephemeral sub-agent story lives: a chained leaf whose subject is a
did:key needs no hosted document at all.

## Adds

- **The `chain` claim** (reserved in core): exactly one entry, the SHA-256
  hash (over the ASCII bytes of the compact serialization) of the immediate
  parent. Each parent carries its own `chain`, so the ancestry is a walked
  linked list, and the full ancestry is pinned transitively: a parent's hash
  covers the parent's own `chain` claim. Presenters carry every ancestor,
  and every chained artifact names `chain` in `crit` (core Section 5), so
  a verifier without this extension rejects it. Verifiers MUST reject a
  `chain` with more than one entry: a longer list carries decoy hashes that
  ride along unverified. Verifiers MUST detect cycles. They MUST check
  issuer-subject linkage (`child.iss == parent.sub`), each ancestor's
  signature, expiry, and revocation, and the root's `iss` against the RP's
  trust anchor. This supersedes working draft 6.2's format (full-ancestry
  list plus a path-consistency rule). The commitment is cryptographically
  equivalent. The single entry is decoy-proof structurally rather than by
  an extra rule, and pairwise hash linkage is the AP2 mandate-chain
  convention, so a grant can slot into AP2/UCP flows without redesign.
- **Key binding through the chain.** A parent's `cnf.jkt` pins the exact key
  that must sign its child.
- **Attenuation rules.** A child never exceeds its parent: `exp` never later,
  `aud` never wider, every scope token authorized verbatim or by a parent
  wildcard (`*`, or prefix form `invoices:*`), constraints provably within the
  parent's under the audience's semantics, else reject.
- **Intermediates.** Delegation envelopes, never accepted as direct grants.
  Attenuation wildcards and array/absent `aud` are legal only here, and an
  intermediate MUST be structurally marked (a distinct `typ`,
  `grant-int+jwt`, registered by this extension) so that every verifier
  rejects it as a direct grant unconditionally, even when it carries a
  plain shape. Without the marker, a plain-shaped intermediate
  presented by a compromised issuance service would satisfy every core rule
  at its full unattenuated breadth.
- **The issuance-service pattern.** Owner signs one medium-lived intermediate
  offline; a hot service mints short-lived leaves; compromise is bounded by
  the intermediate and revocable by its `jti`. The minting interface is
  outside verification, and this extension will profile one for interop: an
  OAuth 2.0 Token Exchange (RFC 8693) request whose `subject_token` is the
  intermediate, whose `requested_token_type` names `grant+jwt`, and whose
  response carries the leaf. Token-exchange-capable issuers (a Keycloak
  realm, a custody provider's signing API) can expose it directly.
  Verification of the resulting artifacts never involves the exchange
  endpoint; every leaf still verifies under this extension's chain rules
  alone, so the profile adds a mint surface and no trust surface.
- **did:key identities for ephemeral sub-agents.** A did:key carries its
  public key inside the identifier, so it resolves with no fetch; it has no
  hosted document, controller, rotation, or revocation, so it can never
  anchor ownership. It exists to be the short-lived `sub` of a chained leaf
  (owner signs the intermediate; an orchestrator mints a leaf whose subject
  is the worker's did:key), and the worker dies with its grant. Encodes an
  Ed25519 or P-256 key (core Section 4). Open item: signed-request carriage.
  `Signature-Agent` requires a URL (core Section 6) and a did:key has none,
  so the presentation profile for did:key subjects (key resolution directly
  from the identifier, `Signature-Agent` absent or repurposed) needs
  definition here.
- **Registration grants.** `scope: "register"` (reserved in core):
  single-use, key-pinned, one-hour authority to create a named identity at a
  hosted directory, with namespace-derivation checks so an owner's signature
  never authorizes a name in someone else's namespace. Drafting requirements
  for the normative text: `aud` names the directory, and the requested name
  is carried explicitly in the grant, never inferred. Namespace containment
  is byte-exact against the owner's identity after core Section 3.1
  validation (which already rejects names that would need escaping).
  Redemption at the directory is an atomic check-and-set keyed by
  (`iss`, `jti`), retained through `exp`.

## Registers

- Claim `chain`.
- Artifact type `grant-int+jwt` (intermediates).
- Scope token `register`, and the wildcard attenuation grammar evaluated
  inside chains (`*`, prefix form). The grammar governs parent-to-child
  containment only; what a scope token means to an audience stays the
  audience's (core Section 5).

## Interaction with core

A core-only verifier rejects every artifact this extension defines: chained
leaves fall to core's `crit` rule (`chain` is always critical),
intermediates to core's `typ` check (`grant-int+jwt`), registration grants
to the reserved `register` scope token. There is no downgrade path. One consequence worth
naming: without this extension, every grant is signed directly by an owner
key, so short grant lifetimes keep that key hot (core Section 8 states the
tradeoff).
