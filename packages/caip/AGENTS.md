# @agentcommercekit/caip

Chain Agnostic Improvement Proposal utilities: CAIP-2 (chain IDs), CAIP-10 (account IDs), and CAIP-19 (asset IDs). Zero runtime dependencies.

## Internal Dependencies

None (leaf package).

## Subpath Exports

Standard schema exports (`./schemas/valibot`, `./schemas/zod`). CAIP schemas are
hand-rolled (not covered by `web-identity-schemas`).

## Key Types

```typescript
type Caip2ChainId = `${string}:${string}`
type Caip10AccountId = string
type Caip19AssetId = string
```

Predefined chain IDs available via `caip2ChainIds` (ethereumMainnet, solanaMainnet, etc.).

## Source Layout

- `src/caips/` - One file per CAIP standard (caip-2.ts, caip-10.ts, caip-19.ts)
- `src/schemas/` - Dual validation schemas (valibot + zod v4)
