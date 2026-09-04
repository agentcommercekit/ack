---
"@agentcommercekit/ack-pay": patch
---

Fixed `verifyPaymentReceipt` not binding the verified receipt's issuer to
the selected `PaymentOption.receiptService`.

Previously, `verifyPaymentReceipt` only checked that the receipt's issuer was
somewhere in the caller's global `trustedReceiptIssuers` list, and that its
`paymentOptionId` existed in the verified Payment Request. It did not check
that the receipt issuer matched the *specific* `receiptService` the selected
payment option named.

In multi-rail deployments where a verifier trusts multiple receipt issuers
globally (e.g. one per payment rail: card, USDC, Solana), this meant a
receipt legitimately issued by one trusted service could be accepted for a
payment option that named a *different* trusted `receiptService`, weakening
per-option trust separation.

`verifyPaymentReceipt` now rejects a receipt whose verified issuer does not
match the selected payment option's `receiptService`, when that value is a
DID. URL-form `receiptService` values are left unenforced, since binding a
DID-based issuer to a URL isn't well-defined without an application-level
policy.
