# @agentcommercekit/jwt

JWT creation and verification. Maps cryptographic curves to JWT algorithms and provides signing/verification using did-jwt.

## Internal Dependencies

`keys`

## Key Types

```typescript
type JwtAlgorithm = "ES256" | "ES256K" | "EdDSA"

// Mapping: secp256r1→ES256, secp256k1→ES256K, Ed25519→EdDSA
```

## Source Layout

- `jwt-algorithm.ts` - Curve-to-algorithm mapping
- `create-jwt.ts` / `verify.ts` - JWT operations
- `signer.ts` - Signer factory wrapping did-jwt signers
- Standard schema exports
