# @agentcommercekit/did

Decentralized Identifier utilities. Type-safe DID URIs using template literal types. Method modules for did:key, did:pkh, and did:web. Resolution support for did:jwks via `jwks-did-resolver` (no method module — resolver-level only).

## Internal Dependencies

`caip`, `keys`

## Key Types

```typescript
type DidUri<
  TMethod extends string = string,
  TIdentifier extends string = string,
> = `did:${TMethod}:${TIdentifier}`

type DidKeyUri = DidUri<"key", `z${string}`>
type DidPkhUri = DidUri<"pkh", Caip10AccountId>
type DidWebUri = DidUri<"web", string>
```

## Source Layout

- `src/methods/` - One file per DID method (did-key.ts, did-pkh.ts, did-web.ts)
- `src/did-resolvers/` - Pluggable resolver with `getDidResolver()` factory
- `src/errors.ts` - `DidDocumentNotFoundError`, `InvalidDidUriError`, `UnsupportedDidMethodError`
- Standard schema exports

## Key Patterns

- did:key uses varint-encoded multicodec prefixes (0xe7=secp256k1, 0xed=Ed25519, 0x1200=secp256r1)
- did:web converts URLs to DID format (slashes become colons)
- did:pkh integrates with CAIP-10 for blockchain account identifiers
- `resolveDidWithController()` handles hierarchical DID resolution
