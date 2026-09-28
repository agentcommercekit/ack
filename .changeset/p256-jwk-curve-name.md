---
"@agentcommercekit/keys": minor
---

secp256r1 JWKs now use the curve name `"P-256"`, the name JOSE registers for
this curve (RFC 7518, Section 6.2.1.1), instead of `"secp256r1"`.
`publicKeyBytesToJwk` and `keypairToJwk` emit `crv: "P-256"`, the JWK guards
accept it, and `jwkToKeypair` maps it back to the `secp256r1` curve.

DID documents built from a secp256r1 keypair publish their key as a JWK by
default, and did-jwt only matches an EC JWK whose `crv` is `"secp256k1"` or
`"P-256"`. An ES256 JWT or credential signed by such an identity therefore
failed verification with "no matching public key found", and a standard P-256
JWK from any other JOSE library was rejected by `isJwk`.

JWKs stored with the old `crv: "secp256r1"` no longer pass the guards; set
`crv` to `"P-256"` to use them.
