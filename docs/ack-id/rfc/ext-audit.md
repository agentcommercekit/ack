# Extension: Audit (stub)

**Extracts v2 working draft sections 8.4 and 10.**

Two audit mechanisms with very different costs: evidence bundles work today
with zero ecosystem; the event log adds detectable-history guarantees for
identities that need them.

## Adds

- **Evidence bundles.** RPs accepting high-stakes grants retain: the
  presented JWTs; the exact fetched bytes of the key documents and
  anchors, with retrieval times and what was validated against them; the
  revocation artifact actually checked; and any signed log heads. The
  result is a self-contained, independently re-verifiable dispute record
  that survives any host disappearing or republishing. Re-fetches never
  repair a bundle; the record is what was seen. Works with core alone;
  SHOULD-level guidance.
- **Event log.** An append-only, hash-chained log of lifecycle events (key
  add/remove, proof add/retract, revocations, deactivation): JCS-hashed
  entries, `prev` linkage, per-entry JWS by the authorizing key
  (`typ: "log-entry+jws"`), signed heads (`typ: "log-head+jwt"`), optional
  host receipts (`typ: "log-receipt+jws"`). Replaying the log MUST reproduce
  the identity's published documents exactly; divergence or conflicting
  signed entries is portable proof of misbehavior.
- **Witnessing.** Heads published to at least one independent append-only
  location, named in the identity's documents, so a host cannot present a
  fabricated history to a first-time verifier. Witness trust belongs to the
  verifier, never the host: a location the host nominates adds nothing
  against that host fabricating history. RPs accept only witnesses they
  trust independently: preconfigured, or a quorum across operators.
  Revocation lists from log-backed issuers SHOULD commit to the log head
  they reflect.

## Registers

- Artifact types `log-entry+jws`, `log-head+jwt`, `log-receipt+jws`.
