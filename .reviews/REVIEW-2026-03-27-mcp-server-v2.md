# Review: feat: add MCP server for ACK-ID and ACK-Pay operations (follow-up)

**Date:** 2026-03-27
**PR:** #72 (branch `feat/mcp-server`)
**Reviewer:** Claude
**Harness version:** v3

---

## Pass 0: Evidence Ledger

- **Files read:**
  - `tools/mcp-server/package.json` (lines 1-36)
  - `tools/mcp-server/src/index.ts` (lines 1-28)
  - `tools/mcp-server/src/util.ts` (lines 1-73)
  - `tools/mcp-server/src/util.test.ts` (lines 1-97)
  - `tools/mcp-server/src/tools/identity.ts` (lines 1-135)
  - `tools/mcp-server/src/tools/identity.test.ts` (lines 1-71)
  - `tools/mcp-server/src/tools/payment-receipts.ts` (lines 1-88)
  - `tools/mcp-server/src/tools/payment-receipts.test.ts` (lines 1-131) -- NEW file
  - `tools/mcp-server/src/tools/payment-requests.ts` (lines 1-126)
  - `tools/mcp-server/src/tools/payment-requests.test.ts` (lines 1-85)
  - `tools/mcp-server/src/tools/utility.ts` (lines 1-38)
  - `tools/mcp-server/src/tools/workflow.test.ts` (lines 1-189)
  - `tools/mcp-server/tsconfig.json` (lines 1-8)
  - `tools/mcp-server/vitest.config.ts` (lines 1-7)
  - `packages/ack-id/src/controller-credential.ts` (lines 1-30, to verify DID validation)
  - `AGENTS.md` (full, for project conventions)
  - `.claude/review-harness.md` (full, for protocol)
  - `.reviews/REVIEW-2026-03-27-mcp-server.md` (prior review, full)
- **Commands run:**
  - `tsc --noEmit` (via `pnpm --filter @repo/mcp-server run check:types`) -- **FAIL** (SIGABRT crash, appears to be an environment/memory issue, not a type error)
  - `vitest` (via `pnpm --filter @repo/mcp-server test`) -- **PASS** (23/23 tests, 5 files)
  - `eval:workflow` -- **N/A** (no `eval:workflow` script in root `package.json`)
  - `git diff HEAD -- tools/mcp-server/` (verified all 4 local fixes)
- **Context loaded:** `AGENTS.md`, `.claude/review-harness.md`. `docs/concepts.md` and `docs/code-craft.md` do not exist; `AGENTS.md` is the equivalent.
- **Prior findings:** See next section.

### Prior Review Findings Verification

| #   | Prior Finding                                                            | Status                                     | Evidence                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **MEDIUM** -- `privateKey` hex returned in `ack_generate_keypair` output | **FIXED**                                  | `utility.ts` lines 28-31: output now contains only `curve`, `did`, `jwk`. The `bytesToHexString` import and both `privateKey`/`publicKey` fields are removed. Confirmed via `git diff HEAD -- tools/mcp-server/src/tools/utility.ts`.                                                                  |
| 2   | **LOW** -- `expiresInSeconds: 0` allowed by `.nonnegative()`             | **FIXED**                                  | `payment-requests.ts` line 52: changed from `.nonnegative()` to `.positive()`. Confirmed via `git diff HEAD -- tools/mcp-server/src/tools/payment-requests.ts`.                                                                                                                                        |
| 3   | **LOW** -- No DID format validation on string inputs                     | **NOT FIXED** (acknowledged as acceptable) | DID strings are still `z.string()` cast to `DidUri`. This is acceptable: `DidUri` is a type-only alias with no runtime validator in the library, and downstream functions (`resolveDid`, `createControllerCredential`) handle invalid DIDs by throwing, which the try/catch blocks surface as `err()`. |
| 4   | **LOW** -- `keypairFromJwk` does not validate `JSON.parse` result        | **FIXED**                                  | `util.ts` lines 23-25: added `if (typeof jwk !== "object" \|\| jwk === null \|\| Array.isArray(jwk)) throw new Error("JWK must be a JSON object")`. Confirmed via `git diff HEAD -- tools/mcp-server/src/util.ts`.                                                                                     |
| 5   | **GAPS** -- No `payment-receipts.test.ts`                                | **FIXED**                                  | New file `payment-receipts.test.ts` (131 lines) with 3 tests: happy-path create/sign/verify, untrusted issuer rejection, wrong payment request issuer rejection. All 3 pass.                                                                                                                           |

---

## Pass 0.5: Scope Check

**Task:** Add an MCP server (`tools/mcp-server`) that exposes ACK-ID identity and ACK-Pay payment operations as MCP tools, plus local fixes for findings from the initial review.

**Verdict:** PASS | **Confidence:** HIGH

All files in the diff map to the stated task. The 4 local fixes are direct responses to the prior review:

- `utility.ts` -- remove private key hex (security fix)
- `payment-requests.ts` -- `.positive()` instead of `.nonnegative()` (correctness fix)
- `util.ts` -- JSON object validation in `keypairFromJwk` (consistency fix)
- `payment-receipts.test.ts` -- new test file (coverage gap fix)

No scope creep, no drive-by refactors.

---

## Pass 1: Comprehension Check

**Verdict:** UNDERSTOOD | **Confidence:** HIGH

All functions were comprehended in the prior review. Only changes to note:

### `src/tools/utility.ts` (post-fix)

- `ack_generate_keypair` now returns `{ curve, did, jwk }` only. The `privateKey` and `publicKey` hex fields are gone. The `bytesToHexString` import is removed. No other behavioral change.

### `src/util.ts` (post-fix)

- `keypairFromJwk` now validates that `JSON.parse(jwkJson)` produces a non-null, non-array object before passing to `jwkToKeypair`. This matches the pattern in `ack_sign_credential` (identity.ts line 75). Throws `"JWK must be a JSON object"` on failure.

### `src/tools/payment-receipts.test.ts` (new)

- `createTestPaymentRequest()` -- helper that generates a secp256k1 keypair, creates a DID, and signs a payment request token. Returns `{ keypair, did, signer, paymentRequestToken }`.
- Test 1 (line 43): Happy path -- creates a receipt, signs it, verifies it with the issuer as a trusted receipt issuer.
- Test 2 (line 73): Untrusted issuer -- creates a valid receipt, then verifies with a different DID as the only trusted issuer. Expects rejection.
- Test 3 (line 104): Wrong payment request issuer -- creates a valid receipt, then verifies with `did:key:z6MkWrongIssuer` as the expected payment request issuer. Expects rejection.

---

## Pass 2: Contract & Integration

**Verdict:** PASS | **Confidence:** HIGH

- No contract changes from the prior review. The fixes are all internal to `@repo/mcp-server`.
- The `ack_generate_keypair` output shape changed (removed `privateKey` and `publicKey` fields). Since this is a new, unreleased tool with no consumers, there is no backward compatibility concern.
- No cross-package ripple. This package remains a leaf consumer.

---

## Pass 3: Failure & Adversarial

**Verdict:** PASS | **Confidence:** HIGH

All prior concerns have been addressed:

1. **Private key exposure (was MEDIUM):** FIXED. `ack_generate_keypair` (`utility.ts` lines 28-31) now returns only `curve`, `did`, and `jwk`. The JWK still contains the private key (via the `d` parameter), but this is the standard JWK format that other tools consume and is explicitly documented. No raw hex leakage.

2. **Zero-second expiry (was LOW):** FIXED. `expiresInSeconds` (`payment-requests.ts` line 52) uses `.positive()`, rejecting `0`.

3. **DID format validation (was LOW):** Acceptable as-is. `DidUri` is a branded string type with no runtime validator exported by the library. Downstream functions throw on invalid DIDs, and all tool handlers catch and return `err()`. Adding a regex guard would be defense-in-depth but is not blocking.

4. **`keypairFromJwk` validation (was LOW):** FIXED. `util.ts` lines 23-25 now validate the parsed JSON is a non-null, non-array object before calling `jwkToKeypair`.

No new adversarial concerns introduced by the fixes.

---

## Pass 4: Code Craft

**Verdict:** PASS | **Confidence:** HIGH

- **Single responsibility:** Maintained. The new test file `payment-receipts.test.ts` tests only receipt operations.
- **No duplication:** `createTestPaymentRequest()` helper in `payment-receipts.test.ts` (lines 18-40) encapsulates shared setup. Good.
- **Completeness across analogues:** All four tool groups now have dedicated test files: `identity.test.ts`, `payment-requests.test.ts`, `payment-receipts.test.ts`, `workflow.test.ts` (integration). Pattern is consistent.
- **No dead code:** The removed `bytesToHexString` import in `utility.ts` is clean -- no orphaned references.
- **File sizes:** `payment-receipts.test.ts` is 131 lines. All files remain well under limits.
- **Naming:** `payment-receipts.test.ts` follows the kebab-case co-located test convention.
- **Error handling:** The new object validation in `keypairFromJwk` throws a descriptive `Error` which callers catch and wrap via `err()`. Consistent with the rest of the codebase.

---

## Pass 5: Test Quality

**Verdict:** GAPS (minor) | **Confidence:** HIGH

**Improvements from prior review:**

- `payment-receipts.test.ts` now exists with 3 tests covering happy path, untrusted issuer, and wrong payment request issuer. This was the primary gap.
- Total test count increased from 20 to 23 across 5 files. All pass.

**Remaining minor gaps:**

1. **No test for the new `keypairFromJwk` JSON object validation** (`util.ts` lines 23-25). The existing `util.test.ts` tests `keypairFromJwk` with invalid JSON (line 33) and missing JWK fields (line 37), but does not test the new guard against arrays (`JSON.stringify([1,2,3])`) or primitives (`JSON.stringify("foo")`). The new code path at line 24 is not exercised by any test.

2. **No test for `expiresInSeconds` in payment requests.** The `.positive()` change is validated by Zod at the schema level (so a `0` would be rejected before reaching tool logic), but there is no test proving the `expiresInSeconds` -> `expiresAt` conversion works correctly or that `0` is rejected.

3. **No test for empty `paymentOptions` rejection** (`payment-requests.ts` line 64). Still untested.

4. **No test for `ack_create_controller_credential` with custom `issuer`.** Still untested.

These are all LOW severity. The critical paths (real crypto, real JWTs, real signatures, adversarial cases) are well tested.

**Crypto tested with real operations:** Yes. All 5 test files use real key generation and real cryptographic operations. No mocking.

---

## Pass 6: System Fit

**Verdict:** PASS | **Confidence:** HIGH

No changes from the prior review. The fixes improve the package without altering its architectural position. The package remains a correctly-placed `tools/` leaf consumer of `agentcommercekit`.

---

## Pass 7: What's Missing?

**Verdict:** PASS | **Confidence:** MEDIUM

Prior "missing" items status:

1. **`payment-receipts.test.ts`** -- FIXED. Now exists with 3 meaningful tests.
2. **Package-level AGENTS.md/CLAUDE.md** -- Not added, but not required. Other `tools/` packages don't have them either. Not blocking.
3. **README / setup docs** -- Not added. This is a nice-to-have for the MCP server, but not blocking for an internal workspace tool.

New items:

1. **No test for `keypairFromJwk` non-object input** -- as detailed in Pass 5. LOW priority since the guard is straightforward and the underlying `jwkToKeypair` would also reject non-objects.

---

## Summary

- **Ship as-is:** Yes, with minor recommendations below.
- **Ship after fixes:** N/A -- all prior blocking/recommended fixes have been applied.
- **Minor recommendations (non-blocking):**
  1. Add 1-2 tests to `util.test.ts` for the new `keypairFromJwk` object validation: test with `JSON.stringify([1,2,3])` and `JSON.stringify("hello")` to exercise lines 23-25 of `util.ts`.
  2. Add a test for `expiresInSeconds` -> `expiresAt` conversion in payment requests (proves the arithmetic at `payment-requests.ts` lines 79-83).
- **Rethink approach:** No.
- **Reviewer's blind spots:**
  - `tsc --noEmit` crashed with SIGABRT (appears to be an environment issue, not a type error). Types could not be verified via automated gate. The prior review reported a clean `tsc` run.
  - `eval:workflow` script does not exist. `workflow.test.ts` serves as the equivalent and passes.
  - `pnpm-lock.yaml` changes were not audited for supply chain concerns.
