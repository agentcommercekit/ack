# ACK-Pay Core (draft RFC)

**Status: proposal draft.** The key words MUST, MUST NOT, SHOULD, SHOULD NOT,
and MAY are to be interpreted as described in RFC 2119.

## 1. Scope

ACK-Pay Core defines how a payment leaves verifiable evidence: a **signed
offer** the seller cannot later deny quoting, a **signed receipt** the buyer
can present to third parties, and a binding from that receipt to the ACK-ID
grant that authorized the payment. It defines no wire protocol, no
settlement mechanism, and no new artifact formats. The artifacts are the
x402 [offer-receipt extension](https://docs.x402.org/extensions/offer-receipt),
adopted as published and profiled here. This profile pins the extension as
shipped in `@x402/extensions` 2.22.0 (x402 repo, offer-receipt source at
commit `59ac597`, 2026-06-17). Upstream changes flow into this profile only
by re-pinning here, never implicitly. Everything else ACK-Pay describes
(roles, payment flows, human oversight, rails other than x402) is design
language: non-normative patterns that define no conformance.

This document layers on ACK-ID core: identities and key resolution (ACK-ID
Sections 3.1-3.2), keys and thumbprints (Section 4), grants (Section 5),
and signed requests (Section 6) are used here without redefinition.

## 2. Terminology

- **Seller**: the party serving the paid resource and signing offers and
  receipts. The x402 resource server.
- **Buyer**: the agent paying for the resource, acting under an ACK-ID
  grant from its owner.
- **Offer**: the seller-signed quote attached to a `402 Payment Required`
  response.
- **Receipt**: the seller-signed acknowledgment attached to the `200 OK`
  response after payment.
- **Rail**: the mechanism that moves the money. Core profiles x402; other
  rails are design language (Section 6).

## 3. Artifacts

The offer and receipt payloads, their placement (offers in the 402 response's
`extensions` member; receipts in the `PAYMENT-RESPONSE` `extensions`), their
field sets (`resourceUrl`, `offerType`, `network`, `amount`, `payTo`,
`validUntil`; `resourceUrl`, `payer`, `network`, `issuedAt`, optional
`txHash`), and their signature encodings are as defined by the x402
offer-receipt extension. This profile constrains them:

- **Signature scheme.** ACK-Pay conformance requires the JWS scheme. An
  EIP-712/did:pkh signature MAY additionally be present; it carries no
  ACK-Pay semantics and is passed through unevaluated.
- **Signer identity.** The JWS signer MUST be a did:web identity per ACK-ID
  core Section 3.1, and verifiers MUST resolve its keys per ACK-ID core
  Section 3.2. This is the same `did.json` the x402 extension documents for
  key discovery: one hosted document serves both protocols. ACK-ID core's
  resolution rules (one fixed location, SSRF protections, freshness)
  apply.
- **Algorithms.** EdDSA and ES256, per ACK-ID core Section 4. Whether ACK
  verifiers also accept ES256K for wallet-adjacent deployments is an open
  decision (Section 8).
- **Key separation.** The offer/receipt signing key MUST NOT be the `payTo`
  account and SHOULD NOT be an owner grant-signing key. A dedicated
  signing key bounds what a compromise can mint.
- **Offer expiry.** Offers MUST carry `validUntil`, and verifiers MUST
  reject an offer past it. Sellers SHOULD keep offer validity short (the
  x402 default of 300 seconds is a reasonable ceiling).

## 4. Identity binding

A receipt's `payer` is a settlement address, which moves money and names no
accountable party. The binding that makes a receipt an accountability
artifact:

- When the paid request was ACK-verified (signed request plus grant, ACK-ID
  core Sections 6-7), the seller SHOULD include in the receipt payload a
  single profile-owned member, `ack`, carrying the agent's DID and the `jti`
  of the grant presented:

  ```json
  "ack": { "agent": "did:web:acme.com:shopper", "grantId": "grn_4kq8" }
  ```

- The `ack` member rides inside the extension's JWS receipt payload and is
  covered by its signature. It has no EIP-712 representation: that schema
  is fixed-typed and cannot carry it, which is one more reason conformance
  requires the JWS scheme (Section 3). A canonical bound-receipt fixture
  ships with the test vectors the ACK-ID RFC tracks as a core deliverable.
  Namespacing the binding under one member keeps
  the profile's footprint in the upstream payload to a single name, so
  upstream evolution cannot collide with it member-by-member. A verifier
  that does not recognize it ignores it: the binding only ever adds
  evidence, never authority, so it is exactly the kind of member that is
  never named `crit` (ACK-ID core Section 5).
- A receipt without the binding is still a valid x402 receipt: it proves
  payment and attributes it to no one. RPs that need the trail reject
  unbound receipts as a policy choice.

The resulting chain, each link independently verifiable: receipt names the
agent (`ack.agent`, signed by the seller); the grant named by
`ack.grantId` binds that agent to its owner (`iss`, signed by the owner);
the owner's legal identity is anchored per ACK-ID ext-controller (ownership
proofs). This is the full trail from a payment event to the legal entity
behind the paying agent, walkable by a third party with no callback to any
participant.

## 5. Third-party verification

A third party verifies a receipt (with its offer, when presented together)
as follows. Checks 1-4 restate the x402 extension's verification in ACK-ID
terms; check 5 is this profile's addition.

1. **Keys**: resolve the signer's keys per ACK-ID core Section 3.2 from the
   signer DID; thumbprint rules per ACK-ID core Section 4.1.
2. **Signatures**: verify the JWS on the receipt, and on the offer when
   present.
3. **Matching**: receipt and offer agree on `resourceUrl` and `network`; the
   offer's `validUntil` had not passed at `issuedAt`.
4. **Freshness**: `issuedAt` is sane for the claimed transaction; where
   `txHash` is present, it MAY be checked against the named network.
5. **The trail**: when the `ack` member is present and the named grant is
   presented alongside the receipt (presenters retain and supply it;
   ext-audit's evidence bundles are the retention shape), verify the grant
   per ACK-ID core Section 7 rules: signature against the owner's keys,
   `sub` equals `ack.agent`, `jti` equals `ack.grantId`. Where
   legal-entity assurance is required, verify the owner's anchors per
   ext-controller. A receipt whose `ack` member arrives without the grant
   attributes the payment but proves no authorization; RPs that need the
   trail treat it as unbound.

What a passing verification proves: the named seller quoted these terms,
acknowledged payment for this resource, and attributed the payment to this
agent under this owner's grant. The receipt carries no amount or `payTo`.
The offer's signature proves the terms. The seller's signed acknowledgment
attests their satisfaction, and `txHash` (check 4) is the on-chain
corroboration where present. It does not prove the resource was
delivered or fit for purpose, that settlement is final on any particular
rail, or that a human approved the payment.

## 6. Other rails (design language)

The offer/receipt pattern is rail-independent: an offer is a signed quote
before payment, a receipt a signed acknowledgment after, whatever moved the
money between them. Mappings for l402, card-network agent programs
(Mastercard Agent Pay and its peers), and bank transfers follow the same
shape and are non-normative until a deployment needs one written down. The
card networks are converging on the same primitives: Mastercard's
Verifiable Intent pilots carry signed, key-bound SD-JWT mandates, so a
mapping there is translation rather than invention. This section is the design-language boundary: flows,
oversight points, and rail mappings live in the ACK-Pay pattern docs and
never define conformance.

## 7. Relationship to the existing ACK-Pay spec

- The payment-request token and payment-service flows are superseded by
  signed offers: the seller signs the quote at the 402, and no intermediary
  mints it.
- VC receipts are superseded by this profile's receipts: plain JOSE, same
  no-VC posture as ACK-ID core.
- The flow and role documents remain as the design language, marked
  non-normative.
- `packages/ack-pay` gets recut against this profile after the RFC
  decisions land, in the same sequence as the ACK-ID SDK.

## 8. Open decisions

1. **Upstreaming the binding member.** `ack` is a profile-defined member of
   the extension's receipt payload; the single namespaced name confines
   collision risk with upstream evolution, but upstreaming is still the
   durable answer. Propose to the x402 extension either the `ack` member as
   an extension point or native attribution fields, so non-ACK verifiers
   learn to display the binding. This should be pursued now, while the
   extension is young; the answer decides whether the member stays
   namespaced or migrates to upstream-native fields.
2. **ES256K.** The x402 JWS scheme allows secp256k1. Accepting it widens
   wallet-key reuse; rejecting it keeps ACK-ID core's two-algorithm
   discipline. Current draft: reject, revisit on deployment evidence.
3. **Offer presentation.** Receipts verify without their offer; disputes
   want both. Should the profile require buyers to retain offers
   (evidence-bundle style, ACK-ID ext-audit) or leave retention to policy?
