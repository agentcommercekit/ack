# Review: feat: add MCP server for ACK-ID and ACK-Pay operations

**Date:** 2026-03-27
**PR:** #72 (branch `feat/mcp-server`)
**Reviewer:** Claude
**Harness version:** v3

---

## Pass 0: Evidence Ledger

- **Files read:**
  - `tools/mcp-server/package.json` (lines 1-36)
  - `tools/mcp-server/src/index.ts` (lines 1-28)
  - `tools/mcp-server/src/tools/identity.ts` (lines 1-135)
  - `tools/mcp-server/src/tools/identity.test.ts` (lines 1-71)
  - `tools/mcp-server/src/tools/payment-receipts.ts` (lines 1-88)
  - `tools/mcp-server/src/tools/payment-requests.ts` (lines 1-126)
  - `tools/mcp-server/src/tools/payment-requests.test.ts` (lines 1-85)
  - `tools/mcp-server/src/tools/utility.ts` (lines 1-41)
  - `tools/mcp-server/src/tools/workflow.test.ts` (lines 1-189)
  - `tools/mcp-server/src/util.ts` (lines 1-69)
  - `tools/mcp-server/src/util.test.ts` (lines 1-97)
  - `tools/mcp-server/tsconfig.json` (lines 1-8)
  - `tools/mcp-server/vitest.config.ts` (lines 1-7)
  - `packages/did/src/resolve-did.ts` (lines 1-35, to verify input validation)
  - `AGENTS.md` (full, for project conventions)
  - `.claude/review-harness.md` (full, for protocol)
- **Commands run:**
  - `tsc --noEmit` (via `pnpm --filter @repo/mcp-server run check:types`) -- **PASS** (no errors)
  - `vitest` (via `pnpm --filter @repo/mcp-server test`) -- **PASS** (20/20 tests, 4 files)
  - `eval:workflow` -- **N/A** (no `eval:workflow` script defined in root `package.json`)
- **Context loaded:** `AGENTS.md`, `.claude/review-harness.md`. `docs/concepts.md` and `docs/code-craft.md` do not exist in this repo; the closest equivalent is `AGENTS.md` which covers architecture, code style, and testing conventions.
- **Prior findings:** No prior review found for this PR.

---

## Pass 0.5: Scope Check

**Task:** Add an MCP server (`tools/mcp-server`) that exposes ACK-ID identity and ACK-Pay payment operations as MCP tools for AI agents.

**Verdict:** PASS | **Confidence:** HIGH

File-by-file justification:
- `package.json` -- new package definition for the MCP server. Required.
- `src/index.ts` -- server entrypoint, registers tools, connects stdio transport. Required.
- `src/tools/identity.ts` -- ACK-ID tools (create/sign/verify credential, resolve DID). Required.
- `src/tools/payment-receipts.ts` -- ACK-Pay receipt tools (create/verify receipt). Required.
- `src/tools/payment-requests.ts` -- ACK-Pay request tools (create/verify payment request). Required.
- `src/tools/utility.ts` -- keypair generation tool. Required (agents need to generate keys).
- `src/util.ts` -- shared helpers (resolver, JWK parsing, response formatting). Required.
- `src/util.test.ts` -- unit tests for util functions. Required.
- `src/tools/identity.test.ts` -- unit tests for identity operations. Required.
- `src/tools/payment-requests.test.ts` -- unit tests for payment operations. Required.
- `src/tools/workflow.test.ts` -- end-to-end workflow eval. Required.
- `tsconfig.json`, `vitest.config.ts` -- build/test config. Required.
- `pnpm-lock.yaml` -- lockfile update for new deps. Required.

No speculative code, no drive-by refactors, no feature extras.

---

## Pass 1: Comprehension Check

**Verdict:** UNDERSTOOD | **Confidence:** HIGH

### `src/index.ts`
Creates an `McpServer` instance, registers four groups of tools (identity, payment-requests, payment-receipts, utility), then connects via stdio transport. No branching. Top-level await on `server.connect()`.

### `src/util.ts`
- `resolver` -- singleton `getDidResolver()` instance shared across all tools.
- `keypairFromJwk(jwkJson)` -- parses a JWK JSON string, delegates to `jwkToKeypair`. Throws on invalid JSON or missing JWK fields (delegated to library).
- `curveToAlg(curve)` -- maps curve name to JWT algorithm. Three supported curves, throws on unsupported. Switch with default throw.
- `ok(data)` -- wraps data as MCP success result. If string, passes through; otherwise JSON-stringifies with 2-space indent.
- `err(error)` -- wraps as MCP error result with `isError: true`. Extracts `.message` from Error instances, falls back to `String(error)`.
- `verification(valid, data)` -- delegates to `ok()` with `{ valid, ...data }`. Used for verify-style tools that return valid/invalid rather than success/error.

### `src/tools/identity.ts`
- `ack_create_controller_credential` -- creates unsigned VC with subject/controller/optional issuer DIDs. Inputs: 3 strings (subject, controller, issuer?). Output: JSON credential. Branches: try/catch only.
- `ack_sign_credential` -- parses credential JSON, parses JWK, signs credential as JWT. Validates that parsed credential is a non-null, non-array object. Branches: try/catch, plus explicit type check on `JSON.parse` result.
- `ack_verify_credential` -- parses JWT credential, verifies signature/expiry, optionally checks trusted issuers. Returns verification result (valid + details or invalid + reason). Two branches: success path returns `verification(true, ...)`, catch returns `verification(false, ...)`.
- `ack_resolve_did` -- resolves DID URI to DID document. Input validation delegated to `resolveDid()` which calls `isDidUri()` internally.

### `src/tools/payment-requests.ts`
- `ack_create_payment_request` -- validates at least one payment option exists, generates random ID, builds `PaymentRequestInit`, optionally adds expiry from seconds, signs JWT. Branches: empty options check (throw), expiresInSeconds presence check (conditional field assignment), try/catch.
- `ack_verify_payment_request` -- verifies payment request JWT, optionally checks issuer. Two paths: success (verification true) or catch (verification false).

### `src/tools/payment-receipts.ts`
- `ack_create_payment_receipt` -- creates unsigned receipt credential from payment request token, option ID, issuer/payer DIDs, optional metadata. try/catch only.
- `ack_verify_payment_receipt` -- verifies receipt JWT, optionally checks trusted receipt issuers and payment request issuer. Two paths: success or catch.

### `src/tools/utility.ts`
- `ack_generate_keypair` -- generates keypair for specified curve (default secp256k1), returns private key hex, public key hex, JWK string, DID, and curve name. try/catch only.

---

## Pass 2: Contract & Integration

**Verdict:** PASS | **Confidence:** HIGH

- **Package boundary:** `@repo/mcp-server` is a new `tools/` package. No other package in the monorepo depends on it (verified via grep for `@repo/mcp-server` across all `package.json` files). It only imports from `agentcommercekit` (umbrella) and `@modelcontextprotocol/sdk`.
- **Tool schema compatibility:** This is a brand-new package; no existing agents or eval suites reference these tool names. No backward compatibility concern.
- **Credential/DID format:** All identity operations delegate to `agentcommercekit` library functions. No custom credential construction or DID formatting.
- **x402 protocol compliance:** Payment tools create and verify payment requests/receipts but do not implement the HTTP 402 handshake directly. They produce the artifacts that other components (x402-gateway) would use.
- **Cross-package ripple:** None. This package is a leaf consumer of the monorepo.

---

## Pass 3: Failure & Adversarial

**Verdict:** CONCERN | **Confidence:** HIGH

1. **MEDIUM -- Private key returned in `ack_generate_keypair` output** (`tools/mcp-server/src/tools/utility.ts`, line 33): The tool returns the raw private key as a hex string in its response. While the JWK is also returned (and is the recommended way to pass keys to other tools), returning the raw hex private key as a separate field creates unnecessary exposure surface. An agent might log or display this. The JWK already contains the private key material in a structured format that other tools consume. Recommend removing the `privateKey` field from the output and only returning the JWK.

2. **LOW -- `expiresInSeconds: 0` produces already-expired payment request** (`tools/mcp-server/src/tools/payment-requests.ts`, line 50-52): The schema uses `.nonnegative()` which allows `0`. With `expiresInSeconds = 0`, the expiry is set to `Date.now()`, producing a payment request that expires immediately. This is likely not useful. Consider using `.positive()` instead, or explicitly handling the `0` case.

3. **LOW -- No DID format validation on string inputs** (`tools/mcp-server/src/tools/identity.ts`, lines 32-41, 69; `payment-receipts.ts`, lines 28-29; `payment-requests.ts`, line 60): DID parameters are accepted as raw `z.string()` and cast with `as DidUri`. While downstream library functions (e.g., `resolveDid`) perform their own validation, tools like `ack_create_controller_credential` pass the value directly to `createControllerCredential` without verifying DID format. If that function doesn't validate, malformed DIDs could be embedded in credentials. The Zod schema could use `.regex(/^did:/)` as a basic guard.

4. **LOW -- `keypairFromJwk` does not validate `JSON.parse` result** (`tools/mcp-server/src/util.ts`, lines 21-24): Unlike `ack_sign_credential` which validates the parsed JSON is an object, `keypairFromJwk` passes the `JSON.parse` result directly to `jwkToKeypair`. The downstream library likely handles this, but it's inconsistent with the pattern established in `identity.ts` line 75.

---

## Pass 4: Code Craft

**Verdict:** PASS | **Confidence:** HIGH

- **Single responsibility:** Each file has a clear, single purpose. Tool files register tools, util provides shared helpers, index is the entrypoint.
- **No duplication:** The `try/catch` + `ok`/`err` pattern is repeated per tool, but this is appropriate -- each tool has unique logic inside the try. The shared `ok`/`err`/`verification` helpers eliminate formatting duplication.
- **Completeness across analogues:** All four tool groups (identity, payment-requests, payment-receipts, utility) follow the same pattern: register function, Zod schema for inputs, try/catch with ok/err or verification. Consistent.
- **No dead code:** Every function and export is used.
- **File sizes:** Largest file is `workflow.test.ts` at 189 lines. All well under 500.
- **Naming:** Files are kebab-case, functions are camelCase verb-first, types are PascalCase. Matches AGENTS.md conventions.
- **Error handling:** Tools return `{ isError: true }` via `err()` for operational errors. Verification tools return `{ valid: false }` for invalid inputs (not errors). This distinction is correct per the harness guidance.
- **Open/Closed:** New tools can be added by creating a new file and calling `registerXTools(server)` in `index.ts`. No modification to existing tool code needed.
- **No semicolons, double quotes, trailing commas** -- matches oxfmt conventions in AGENTS.md.

---

## Pass 5: Test Quality

**Verdict:** GAPS | **Confidence:** HIGH

1. **No dedicated unit tests for `payment-receipts.ts`.** There is `identity.test.ts` and `payment-requests.test.ts`, but no `payment-receipts.test.ts`. Receipt creation/verification is covered in `workflow.test.ts`, but only on the happy path. There is no test for: invalid receipt JWT, untrusted receipt issuer, or mismatched payment request issuer.

2. **No test for `ack_create_controller_credential` with custom `issuer` parameter.** The identity test (line 16-26) only tests subject + controller. The optional `issuer` field is never exercised.

3. **No test for `expiresInSeconds` behavior in payment requests.** The payment request test creates tokens without expiry. The `expiresInSeconds` → `expiresAt` conversion (payment-requests.ts lines 79-83) is untested.

4. **No test for empty `paymentOptions` rejection.** The explicit validation at `payment-requests.ts` line 64 (`if (paymentOptions.length === 0)`) has no corresponding test.

5. **Workflow test covers the wiring gap well.** The end-to-end test in `workflow.test.ts` proves the full identity + payment cycle works. The adversarial cases (wrong key signature, untrusted issuer) are tested. This is solid.

6. **Crypto tested with real operations.** All tests use real key generation, real signatures, real JWTs. No mocking of cryptographic operations.

---

## Pass 6: System Fit

**Verdict:** PASS | **Confidence:** HIGH

- **Architecture alignment:** The MCP server follows the established `tools/` directory pattern (alongside `api-utils`, `cli-tools`, `typescript-config`). It is a thin wrapper over `agentcommercekit` -- no business logic reimplemented.
- **Package cohesion:** Correctly placed in `tools/` as an internal workspace package (not published). Imports from the umbrella `agentcommercekit` package rather than reaching into individual packages.
- **Observability:** Errors are surfaced to the MCP client via `isError: true` responses. No internal logging, but for an MCP tool this is appropriate -- the client (AI agent) handles reporting.
- **Rollback safety:** New package, no consumers. Can be removed without breaking anything.
- **Config vs code:** No hardcoded env-specific values. The DID resolver uses defaults (appropriate for did:key which needs no external infrastructure).
- **Dependency hygiene:** Two dependencies: `@modelcontextprotocol/sdk` (official MCP SDK, well-maintained) and `zod` (from catalog, already used across the monorepo). Minimal and appropriate.

---

## Pass 7: What's Missing?

**Verdict:** MISSING | **Confidence:** MEDIUM

1. **No `payment-receipts.test.ts`** -- as noted in Pass 5. This is the only tool file without a dedicated test file, breaking the pattern established by `identity.test.ts` and `payment-requests.test.ts`.

2. **No AGENTS.md or CLAUDE.md for the mcp-server package.** Every other package in `packages/` has one. While `tools/` packages are less consistent (checked: `api-utils` and `cli-tools` don't have them either), adding one would help future contributors.

3. **No `.env.example` or documentation on how to configure/run the MCP server.** The `package.json` has a `bin` field (`ack-mcp`) and a `start` script, but there's no README explaining how to add this server to an MCP client configuration (e.g., Claude Desktop `claude_desktop_config.json`).

---

## Summary

- **Ship as-is:** No
- **Ship after fixes:**
  1. **(Recommended)** Remove `privateKey` hex string from `ack_generate_keypair` output (`utility.ts` line 33). The JWK already contains the key material and is what other tools consume. Returning raw hex unnecessarily exposes key material.
  2. **(Recommended)** Add `payment-receipts.test.ts` with at least: happy-path receipt create/verify, invalid receipt JWT, untrusted issuer rejection.
  3. **(Minor)** Change `expiresInSeconds` from `.nonnegative()` to `.positive()` in `payment-requests.ts` line 52, or handle `0` explicitly.
- **Rethink approach:** No fundamental issues. The architecture is clean and follows monorepo conventions.
- **Reviewer's blind spots:** I could not run `eval:workflow` because the script does not exist in the root `package.json`. The `workflow.test.ts` file serves as the functional equivalent and passes. I did not verify the `pnpm-lock.yaml` diff (282 lines of lockfile changes) for supply chain concerns.
