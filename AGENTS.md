# Agent Commerce Kit (ACK)

TypeScript monorepo providing verifiable AI identity (ACK-ID) and automated payment processing (ACK-Pay) protocols built on W3C DIDs and Verifiable Credentials.

## Commands

```bash
pnpm run setup                        # Install deps + build (safe to re-run)
pnpm run build                        # Build all packages
pnpm run check                        # Full CI: format + types + lint + test
pnpm run test                         # All tests
pnpm run fix                          # lint:fix + format
pnpm --filter ./packages/[name] test  # Single package test
pnpm --filter ./packages/[name] build # Single package build
```

## Package Dependency Graph

```
agentcommercekit  (umbrella re-export)
├── ack-id        → did, jwt, keys, vc
├── ack-pay       → did, jwt, keys, vc
├── vc            → did, jwt, keys
├── did           → caip, keys
├── jwt           → keys
├── caip          (leaf)
└── keys          (leaf)
```

Changes to a leaf package require rebuilding everything above it. Turbo handles this via `"dependsOn": ["^build"]`. Demos and examples import from built `dist/` output, not source.

## Architecture

### Directory Layout

- **`packages/`** - Core NPM-published packages (8 packages, see dependency graph above)
- **`demos/`** - Interactive protocol demonstrations (each runnable independently)
- **`examples/`** - Standalone services: credential issuer, verifier, local DID host
- **`tools/`** - Internal workspace packages (not published):
  - `api-utils` - Hono API helpers, middleware, JWT validation
  - `cli-tools` - Demo CLI utilities
  - `typescript-config` - Shared tsconfig bases
- **`docs/`** - Mintlify documentation site (`pnpm dev:docs`)

### Build Pipeline

Each package uses **tsdown** (not tsc) for building:

- Config: `tsdown.config.ts` per package with multiple entry points
- Output: `dist/` with ESM (.js) + TypeScript declarations (.d.ts)
- TypeScript target: ES2022, module: ESNext, bundler resolution
- All packages are ESM-only (`"type": "module"`)

### Dual Validation Schema Pattern

Most packages export validation schemas through **three files** with **four export paths**:

```
src/schemas/
├── valibot.ts        → ./schemas/valibot
└── zod/
    ├── v3.ts         → ./schemas/zod/v3  AND  ./schemas/zod (alias)
    └── v4.ts         → ./schemas/zod/v4
```

Valibot is the primary validation library (a runtime dependency in most packages, optional peer in `caip` and `jwt`). Zod is an optional peer dependency everywhere.

When adding new types, you must:

1. Add the schema to all three files (`valibot.ts`, `zod/v3.ts`, `zod/v4.ts`)
2. Add entry points to `package.json` exports
3. Add entry points to `tsdown.config.ts` entry array

Exception: `keys` package has no schema exports (exports curve-specific files and encoding instead).

### Dependency Management

- Exact versions enforced by `.npmrc` (`save-exact=true`)
- Shared versions via pnpm catalog in `pnpm-workspace.yaml`
- Workspace dependencies use `workspace:*`
- Catalog dependencies use `catalog:`
- Peer dependencies use semver ranges

## Testing

Vitest with individual `vitest.config.ts` per package.

- Test files co-located with source as `*.test.ts`
- Assertive test names: `it("creates...")`, `it("throws...")`, `it("requires...")`, `it("returns...")`
- Partial mocks: `vi.mock()` with `vi.importActual()` to preserve real implementations

## Code Style

### Formatting (oxfmt)

- No semicolons
- Double quotes
- Trailing commas
- 2-space indentation
- Import sorting handled by oxfmt

### Linting (oxlint)

- Unused vars: warning with `^_` prefix ignore pattern
- Config: `.oxlintrc.json` at repo root, run from root (not per-package)

## Demos

```bash
pnpm demo:identity        # ACK-ID protocol demo
pnpm demo:identity-a2a    # ACK-ID with Google A2A protocol
pnpm demo:payments        # ACK-Pay protocol demo
pnpm demo:e2e             # End-to-end (ACK-ID + ACK-Pay)
pnpm demo:skyfire-kya     # Skyfire KYA token demo
```
