# ACK-Pay Core RFC (proposal)

Draft restructuring of ACK-Pay into a design language plus one small
normative profile. Not wired into the docs site; discussion material only.

Depends on the [ACK-ID core RFC](../../ack-id/rfc/README.md) for identities,
key resolution, grants, and signed requests. Read that first.

## Motivation

The payments wire layer is already won: x402, l402, h402, and the card
networks' agent programs define how money moves. A competing ACK wire
protocol would add confusion and get no adoption. None of them provides
accountability: a quote a seller cannot later deny, a proof of payment a
buyer can show to a third party, and a trail from that payment back to the
owner behind the paying agent.

x402 now ships signed offers and receipts as an extension
([offer-receipt](https://docs.x402.org/extensions/offer-receipt)), with JWS
signing and did:web key discovery from `did.json`. That is the artifact layer
ACK-Pay would otherwise have had to invent, discoverable from the same DID
document ACK-ID core already reads. So ACK-Pay stops being a protocol and
becomes:

1. **A design language** (non-normative): the roles, the client- and
   server-initiated flows, human oversight points, and how the offer/receipt
   pattern maps onto any rail.
2. **One normative profile** ([core](./core.md)): adopt the x402
   offer-receipt artifacts (pinned at a named version, core Section 1), sign
   them with ACK-ID identities, and bind receipts to the grant that
   authorized the payment. That binding is the trail: receipt to agent,
   agent to grant, grant to owner, owner to legal entity (ACK-ID
   ext-controller). Core + this profile is one of the two flagship pairings
   named in the ACK-ID RFC; the accountability trail is the gap the wire
   protocols leave.

## Document map

| Current ACK-Pay material                                 | Lands in                                              |
| -------------------------------------------------------- | ----------------------------------------------------- |
| introduction, components-roles, use-cases                | design language (non-normative)                       |
| client-initiated-sequence, server-initiated-sequence     | design language (non-normative)                       |
| core-payment-sequences, hitl, operational-considerations | design language (non-normative)                       |
| payment-request-payload, payment-service                 | superseded by signed offers ([core](./core.md))       |
| receipt-verification (VC receipts)                       | superseded by the receipt profile ([core](./core.md)) |
| `packages/ack-pay` (JWT request tokens, VC receipts)     | recut against the profile after RFC decisions         |

## Open decisions

See [core Section 8](./core.md#8-open-decisions).
