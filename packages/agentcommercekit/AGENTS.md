# agentcommercekit

Umbrella package that re-exports all ACK sub-packages. Contains no original code.

## Internal Dependencies

All 7 other packages.

## Subpath Exports

| Export            | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `.`               | Re-exports: ack-id, ack-pay, caip, did, jwt, keys, keys/encoding, vc |
| `./a2a`           | Re-exports from ack-id/a2a                                           |
| `./schemas/*`     | Aggregated schemas from all sub-packages                             |
| `./a2a/schemas/*` | A2A-specific schemas                                                 |

## When Editing

This package only contains re-exports. If you need to add new functionality, add it to the appropriate sub-package, then ensure it's re-exported through the barrel files here:

- `src/index.ts` - Main re-exports
- `src/schemas/valibot.ts` - Aggregated valibot schemas
- `src/schemas/zod/v3.ts` / `v4.ts` - Aggregated zod schemas
- `src/a2a/` - A2A re-exports
