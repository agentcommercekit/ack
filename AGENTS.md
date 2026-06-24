# Agent Commerce Kit (ACK)

TypeScript monorepo for verifiable AI identity (ACK-ID) and automated payment (ACK-Pay) protocols, built on W3C DIDs and Verifiable Credentials. Uses **pnpm** workspaces with **turbo**; all packages are ESM-only.

# CRITICAL — Read first

- Adding a validation type means editing **every** schema venue or the build breaks — see Dual Validation Schemas below.
- All Pull Requests and Issues must follow the [AI Usage Policy](./AI_POLICY.md): disclose in the body which AI tools were used (e.g. Claude Code, Cursor, Copilot) and the extent of assistance, or state explicitly that none were used.
- A change to a leaf package (`keys`, `caip`) requires rebuilding everything above it; turbo handles ordering via `^build`. Demos and examples import from built `dist/`, not source.

## Commands

```bash
pnpm run setup                          # Install deps + build (safe to re-run)
pnpm run build                          # Build all packages (turbo)
pnpm run check                          # Full CI: build + lint (incl. type checking) + format + test
pnpm run test                           # All tests
pnpm run fix                            # lint:fix + format (oxlint + oxfmt)
pnpm --filter ./packages/<name> test    # Single package test
pnpm --filter ./packages/<name> build   # Single package build
```

Demos: `pnpm demo:identity`, `demo:identity-a2a`, `demo:payments`, `demo:e2e`, `demo:skyfire-kya`. Docs site: `pnpm dev:docs`.

## Architecture

Dependency graph (each package depends on those to its right):

```
agentcommercekit  (umbrella re-export)
├── ack-id  → did, jwt, keys, vc
├── ack-pay → did, jwt, keys, vc
├── vc      → did, jwt, keys
├── did     → caip, keys
├── jwt     → keys
└── caip, keys  (leaves)
```

- Each package builds with **tsdown** (not tsc), configured per-package in `tsdown.config.ts` with multiple entry points; outputs ESM `.js` + `.d.ts` to `dist/`.
- `tools/` holds internal, unpublished workspace packages (`api-utils`, `cli-tools`).
- Shared TypeScript config lives in the root `tsconfig.json`; each sub-project extends it via a relative path. The `examples/*` add `allowJs`/`jsx` on top.

### Type checking

There is **no `tsc`/`check:types` step**. Type checking runs through oxlint: `.oxlintrc.json` sets `options.typeAware` + `options.typeCheck` (backed by `oxlint-tsgolint`), so `pnpm run lint` reports TypeScript compiler diagnostics (e.g. `TS2322`) alongside lint findings. Type checking needs the workspace `dist/` present, so build first — `pnpm run check` runs `turbo build` before `turbo check`. Do not re-introduce per-package `tsc --noEmit` scripts.

### Dual Validation Schemas

Valibot is primary (runtime dependency); Zod is an optional peer everywhere. Most packages expose schemas through three files / four export paths:

```
src/schemas/
├── valibot.ts   → ./schemas/valibot
└── zod/
    ├── v3.ts    → ./schemas/zod/v3  AND  ./schemas/zod (alias)
    └── v4.ts    → ./schemas/zod/v4
```

Adding a new type requires updating all three schema files **and** the `exports` map in `package.json` **and** the entry array in `tsdown.config.ts`. (`keys` is the exception — it exports curve-specific files and encoding, no schemas.)

### Dependencies

- Exact versions enforced by `saveExact: true` in `pnpm-workspace.yaml`.
- Workspace deps use `workspace:*`; shared external versions use `catalog:` (pnpm catalog in `pnpm-workspace.yaml`).

## Testing

Vitest, one `vitest.config.ts` per package, `*.test.ts` co-located with source.

- Test names are assertive: `it("creates…")`, `it("throws…")`, `it("requires…")`, `it("returns…")`.
- For partial mocks, combine `vi.mock()` with `vi.importActual()` to preserve real implementations.

# CRITICAL — Read last

- Adding a validation type means updating every schema file + `package.json` exports + `tsdown.config.ts`, or the build breaks.
- PRs and Issues must disclose AI usage in the body per [AI_POLICY.md](./AI_POLICY.md).
- Leaf changes (`keys`, `caip`) require rebuilding dependents; turbo handles this via `^build`.
