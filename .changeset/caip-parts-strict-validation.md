---
"@agentcommercekit/caip": patch
---

Fix: `caip2Parts` and `caip10Parts` now validate the full input string
instead of silently truncating it.

Both functions parsed their input with `caip.split(":")` and destructured
the first two (or three) resulting segments, only checking that those
segments were non-empty. `split` does not enforce an upper bound on the
number of segments, so a malformed string with extra trailing `:segments`
(e.g. `"eip155:1:extra"` for `caip2Parts`, or
`"eip155:1:0xabc...:extra"` for `caip10Parts`) would parse "successfully",
silently discarding everything after the expected number of colons instead
of being rejected.

`caip10Parts` is used by `@agentcommercekit/did`'s `did:pkh` method
(`createVerificationMethod`, reached via
`createDidPkhDocumentFromCaip10AccountId`) to build a DID document's
verification method from a caller-supplied CAIP-10 account ID. That call
path does not otherwise re-validate the account ID against the CAIP-10
pattern, so a malformed account ID could previously produce a DID document
with silently truncated/incorrect account data instead of throwing.

Both functions now test the input against their full `RegExp` pattern
(`caip2ChainIdRegex` / `caip10AccountIdRegex`) before parsing, so malformed
input is rejected up front.
