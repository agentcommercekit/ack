---
"@agentcommercekit/keys": minor
"@agentcommercekit/did": minor
---

`publicKeyMultibase` on a `Multikey` verification method is now an actual
Multikey: `multibase(base58-btc, varint(multicodec code) ‖ key-bytes)`, with
secp256k1 and secp256r1 keys in their 33-byte compressed form. It previously
multibase-encoded the raw public key bytes, so the value carried no algorithm
identifier and a relying party could not tell one curve's key from another's.
`createDidKeyUri` already built the prefixed form, so the same key came out two
different ways depending on which function produced it; the two now agree, and
`publicKeyMultibase` equals the `did:key` method-specific identifier for the
same key.

This changes the value emitted by `createDidDocument`,
`createDidDocumentFromKeypair`, `createDidWebDocument` and
`encodePublicKey("multibase", ...)`, for the `multibase`, `hex` and `base58`
encodings — `hex` and `base58` are converted to a `Multikey` verification
method, so they carry the same value. Documents built with the default `jwk`
encoding are unaffected. A document published with the old value keeps whatever
it was published with; re-generating it produces the corrected value.

`encodePublicKey("multibase", bytes, curve)` now throws when `bytes` is not a
public key on `curve`, for every curve. It previously accepted any bytes and
encoded them, which is how a value that was not a key could end up in a
`Multikey` — and a Multikey states which curve its key is on, so bytes that are
not a key on that curve must not carry one of these prefixes.

Adds `publicKeyToMultikey(publicKey, curve)` and `keyCurveMulticodecs` to
`@agentcommercekit/keys`, plus `compressPublicKey` on the `secp256k1` and
`secp256r1` curve modules.
