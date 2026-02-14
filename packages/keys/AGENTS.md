# @agentcommercekit/keys

Cryptographic foundation layer. Keypair generation, public key encoding, and curve-specific operations for Ed25519, secp256k1, and secp256r1. No internal ACK dependencies.

## Internal Dependencies

None (leaf package).

## Subpath Exports

| Export        | Description                                           |
| ------------- | ----------------------------------------------------- |
| `.`           | Main API: `Keypair`, `KeyCurve`, public key utilities |
| `./encoding`  | Base58, base64url, hex, JWK, multibase conversions    |
| `./ed25519`   | Ed25519 curve operations                              |
| `./secp256k1` | secp256k1 curve operations                            |
| `./secp256r1` | secp256r1 curve operations                            |

No schema exports (unlike other packages).

## Key Types

```typescript
type KeyCurve = "secp256k1" | "secp256r1" | "Ed25519"

interface Keypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
  curve: KeyCurve
}
```

## Source Layout

- `src/curves/` - One file per curve (ed25519.ts, secp256k1.ts, secp256r1.ts)
- `src/encoding/` - One file per format (base58.ts, base64.ts, hex.ts, jwk.ts, multibase.ts)
- Uses `@noble/curves` for all cryptographic operations
