# ACK-ID Core RFC (proposal)

Draft restructuring of the ACK-ID v2 working draft into a small core RFC plus
named extensions. Not wired into the docs site; discussion material only.

The v2 working draft referenced throughout (`docs/ack-id/specification.mdx`
and its section numbers) lives on the `ack-id-v2` branch
([PR #7](https://github.com/catena-labs/ack-private/pull/7)), not on `main`.

## Motivation

The v2 spec's L1-L4 conformance levels are an admission that it is four specs
stapled together. This proposal makes that structure literal: the core RFC is
roughly today's L1, and everything above it becomes an extension document that
can be adopted, versioned, and argued about independently.

Design guidelines for the core:

1. Use grants.
2. Work with Web Bot Auth as deployed today.
3. Plain JOSE; no VC machinery.
4. "It works with what you have", and a missing document is a failure,
   never a fallback. Core resolves keys from one fixed path per identity,
   the did:web resolution rule (`<identity URL>/did.json`;
   `/.well-known/did.json` for a bare domain), and reads only the
   `publicKeyJwk` entries. Orgs whose keys live behind an OIDC `jwks_uri`
   reuse them via the discovery profile in ext-web. That profile is opt-in
   rather than core, for two reasons: a fallback triggered by a 404 turns
   key removal (core's revocation lever) into a silent widening of the
   trusted key set, and the discovery locations real OIDC providers use do
   not match path identities anyway.

The target: implementable with a stock JOSE library and an HTTP client in an
afternoon.

The through-line of the split: the ideas DIDs and VCs were for survive in
core (self-issued identifiers with no central registry, key rotation that
survives identity, signed portable claims about who may do what,
callback-free verification), while their encodings (JSON-LD, the VC data
model, presentation exchange, generalized DID resolution) move out.
Semantically a grant is a verifiable credential; ext-attestations keeps a
mechanical, non-normative mapping to the VC data model, so the VC and eIDAS
world re-enters as an adapter, never as a core dependency. Core dependencies
can never be removed; adapters can be added whenever demand shows up.

Core is the foundation. The pairing that carries the original ACK-ID
promise, a verifiable line from a request back to the accountable entity
behind an agent, is **core + ext-controller**, which is why
ext-controller is drafted as a full RFC while the other extensions remain
stubs. The other flagship pairing is core + ACK-Pay: payment receipts that
walk back to an owner.

## Document map

| Current v2 spec section                                                               | Lands in                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 3.2 documents (keys only), 4 keys, 4.1 thumbprints                                    | [core](./core.md)                                           |
| 6 grant format, 6.1 leaf rules                                                        | [core](./core.md)                                           |
| 8.1 minimal verification, 8.2 signed requests                                         | [core](./core.md)                                           |
| 9 revocation levers (jti single-use, short exp, key removal, owner unpinning)         | [core](./core.md)                                           |
| 3.1 controllers; 5 ownership proofs; 6.3 control grants; 4.2 key purpose              | [ext-controller](./ext-controller.md)                       |
| 3.1 did:key; 6.2 chains and attenuation; 6.4 issuance service; 6.5 registration       | [ext-delegation](./ext-delegation.md)                       |
| 9.1 signed revocation list; 9.2 status list                                           | [ext-revocation](./ext-revocation.md)                       |
| 8.2 OAuth carriage; CIMD; DPoP; keyless clients; Web Bot Auth directory; RP discovery | [ext-web](./ext-web.md)                                     |
| 7 attestations                                                                        | [ext-attestations](./ext-attestations.md)                   |
| 8.3 full verification                                                                 | [ext-controller](./ext-controller.md)                       |
| 8.4 evidence bundles; 10 event log                                                    | [ext-audit](./ext-audit.md)                                 |
| 11 artifact type discipline                                                           | core Section 9 (extensions append rows)                     |
| 12 security considerations                                                            | core Section 10 (extensions carry their own)                |
| 1.2 test vectors                                                                      | core deliverable, tracked alongside it                      |
| 4.3 signer backend interface                                                          | cut; what survives is core Section 9's signing-tooling note |
| 13 hosted directory profile                                                           | stays a non-normative profile                               |

[ext-controller](./ext-controller.md) is drafted as a full RFC; it carries
the ownership pitch and deserves the same scrutiny as core. The remaining
extension stubs summarize scope and defer normative text to the v2 working
draft sections they extract.

## What stays in core even though it looks like extra

- `cnf` possession binding. Without it grants are bearer tokens.
- The `crit` rule and rejected unknown `constraints`: a verifier rejects
  any grant whose `crit` names a claim it does not implement, and any grant
  whose `constraints` carry a member it does not understand. These two
  rules are the extension mechanism; a meaning-changing extension claim
  (`chain`, `status`) rides under `crit` and can never downgrade a
  core-only verifier.
- A complete minimal revocation story (`jti` single-use, short `exp`, agent
  key removal, owner-key unpinning). Revocable is half the point of grants;
  the list mechanisms move out, the levers stay.

## Settled decisions

1. **Identifier spelling in `iss`/`sub`: did:web stays canonical, presented
   URL-first.** Earlier drafts of this proposal spelled identities as bare
   URLs in core and moved DIDs to ext-controller. Two things settled it the
   other way: the x402 offer-receipt extension identifies JWS signers as
   did:web and resolves their keys from the same `did.json` core reads, so a
   URL-only core would reintroduce a second spelling the moment payments
   enter; and ext-controller's controller derivation operates on the DID
   path. The Cloudflare-shaped objection (their Wallets product
   deliberately avoids DID-like schemes) changed the presentation and left
   the wire format alone: core Section 3 now leads with the identity URL,
   treats the DID spelling as a serialization requiring no DID library,
   and uses the URL form wherever an external spec requires a URL
   (`Signature-Agent`, per Web Bot Auth), with a bijective mapping and no
   aliasing.
2. **Key location: the did:web resolution rule.** `<identity URL>/did.json`
   for path identities, `/.well-known/did.json` for a bare domain; core reads
   only the `publicKeyJwk` entries and ignores the rest of the document. One
   hosted document then serves ACK-ID, ACK-Pay receipts, and x402
   offer-receipt verification. (Earlier drafts used separate `jwks.json`
   paths; that meant a second document for no added capability.) Fetches
   follow redirects, with the SSRF checks applied to every hop: the fixed
   path is where resolution starts, not a constraint on serving topology.
3. **Control grants live in ext-controller.** Core verifiers pin owner
   keys at onboarding and never consume a control grant, so moving them
   into core would add surface with no core consumer. The counterargument
   (they are the ownership story, and burying them weakens the pitch) is
   answered by framing: ext-controller is drafted as a full RFC, and
   core + ext-controller is presented as the flagship pairing throughout.
4. **did:key lives in ext-delegation, not ext-controller.** The ephemeral
   sub-agent case is delegation-shaped (owner signs an intermediate, an
   orchestrator mints a chained leaf for a did:key worker), so the whole
   story reads in one document. ext-controller is about ownership of
   consequential identities, which did:key can never anchor.
5. **The authority artifact is a grant, not a mandate.** Earlier drafts
   called it a mandate. That word now carries at least three meanings in
   agent commerce: AP2's Intent and Cart Mandates (a human approving a
   purchase), a policy-shaped usage in finance ("keep the portfolio
   balanced"), and this artifact. The first two are not ours to rename, and
   an AP2 mandate can ride in the same request as this artifact, so one word
   for both is unworkable. Qualifiers ("agent mandate") do not survive into
   `typ` values or HTTP field names. "Grant" is the verb core already used
   to define the artifact, it names a signed instrument rather than a rule
   (which "permission" does not), and `Grant` is free as an HTTP field name
   where `Authorization` and `Authority` are taken. The layer boundary this
   makes explicit: an AP2 mandate says a human approved a transaction; an
   ACK-ID grant says an owner authorized an agent to act. ACK documents use
   "mandate" only when citing AP2.
6. **Controller derivation never crosses DNS labels.** A subdomain-hosted
   agent (`agent.company.service.com`) is a bare origin, legal everywhere in
   core, but in ext-controller it is an apex with no derived controller. A
   label-based rule would need the Public Suffix List as its stop boundary
   (an external, continuously edited dependency on which two verifiers
   could disagree), and DNS delegation does not track organizational
   control.
   Platforms that want the ownership chain name agents as path identities
   under the company host (`did:web:company.service.com:agent-name`);
   identities name where keys live rather than where traffic is served, so
   per-agent subdomains can stay for routing.
7. **`chain` carries one hash: the immediate parent.** The working draft
   (6.2) had the leaf enumerate its full ancestry plus a path-consistency
   rule; ext-delegation now specifies pairwise linkage: each artifact hashes
   only its immediate parent, and ancestry is pinned transitively because a
   parent's hash covers the parent's own `chain`. The commitment is
   equivalent; the single entry is structurally decoy-proof where the flat
   list needed the consistency rule to be enforced correctly; delegation is
   local (a holder extends the chain knowing only its parent); and pairwise
   hashing is the AP2 mandate-chain convention, so grants slot into AP2/UCP
   flows without redesign. Field-tested in the id.sh reference
   implementation, whose panel regressions include the decoy-hash rejection.
   Known limit, true of any hash-linked format: an ancestor can never be
   inserted above an issued root without reissuing everything below it.
8. **Unknown grant claims are ignored; `crit` marks the exceptions.**
   Earlier drafts closed the claim table: a core verifier rejected any
   top-level claim it did not recognize. PR #9 review argued that JWT
   implementers expect additive claims to be ignored, and the closed table
   made every extension claim a breaking change even when ignoring it was
   safe. Core now follows the RFC 7515 `crit` pattern on payload claims:
   verifiers ignore unrecognized claims, and a claim that changes the
   grant's meaning MUST be named in `crit`, which verifiers without the
   extension reject. The cost, stated openly: the safety of the rule moved
   from the verifier to the issuer. Extensions therefore also give their
   artifacts a second rejection surface (a distinct `typ`, a reserved
   scope token, an `aud` shape core rejects) where ignoring a claim would
   widen authority.
9. **Wildcard scope tokens are not reserved.** Earlier drafts reserved any
   scope token containing `*` for ext-delegation. Scope meaning is
   audience-owned, and the blanket reservation blocked RPs from their own
   wildcard grammar (PR #9 review). Only `control` and `register` stay
   reserved; ext-delegation's attenuation wildcards apply to
   parent-to-child containment inside chains, which core-only verifiers
   never accept anyway.
