---
"@agentcommercekit/keys": patch
---

`publicKeyBytesToJwk` now rejects Ed25519 public keys that are not 32 bytes,
as it already does for secp256k1 and secp256r1. The Ed25519 branch encoded
whatever bytes it was given, so `createDidPkhDocument` built a DID document
with a malformed `publicKeyJwk` for any Solana address that is valid base58
but not a 32-byte key (for example `abc`) instead of failing.
