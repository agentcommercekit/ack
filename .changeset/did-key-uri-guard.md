---
"@agentcommercekit/did": patch
---

`isDidKeyUri` no longer accepts `did:key:z`, the multibase prefix carrying no
key material. The check sliced from index 8 — the length of `"did:key:"`, not of
`"did:key:z"` — so the `z` stayed in the string it tested and satisfied the `+`
in `z[a-km-zA-HJ-NP-Z1-9]+` by itself. The guard therefore vouched for a DID
that `getDidResolver().resolve()` reports as `invalidDid`. The check is now a
single pattern spanning the whole URI, so the quantifier applies to the
base58btc value as the documented grammar intends. Every other input is
unaffected: `z` is itself a base58btc character, so it was the only string the
old slice let through.
