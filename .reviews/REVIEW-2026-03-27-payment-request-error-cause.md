# Review: fix(ack-pay): preserve original error cause in verifyPaymentRequestToken

**Date:** 2026-03-27
**PR:** https://github.com/agentcommercekit/ack/pull/65
**Reviewer:** Claude
**Harness version:** v3

---

## Pass 0: Evidence Ledger
- **Files read:**
  - `packages/ack-pay/src/errors.ts` (lines 1-6, full file)
  - `packages/ack-pay/src/verify-payment-request-token.ts` (lines 1-65, full file)
  - `packages/ack-pay/src/verify-payment-request-token.test.ts` (lines 1-209, full file)
  - `packages/ack-pay/src/verify-payment-receipt.ts` (lines 1-124, full file)
  - `packages/ack-pay/src/index.ts` (lines 1-8, full file)
  - `tools/api-utils/src/middleware/error-handler.ts` (lines 1-40, full file)
  - `tools/api-utils/src/api-response.ts` (lines 1-59, full file)
  - `packages/vc/src/verification/errors.ts` (lines 1-58, full file)
  - `packages/did/src/errors.ts` (lines 1-29, full file)
  - `docs/overview/concepts.mdx` (full file)
- **Commands run:**
  - `npx tsc -b --noEmit`: Pre-existing errors in `examples/verifier`, `examples/local-did-host`, `packages/did/scripts`, `packages/jwt/scripts` (unrelated to this PR). No new errors introduced.
  - `npx vitest run packages/ack-pay`: **32 tests passed**, 7 test files, 0 failures.
  - `gh pr diff 65`: Diff retrieved and analyzed.
  - `gh pr view 65 --json commits`: Confirmed 2 commits, including fix commit `e74f097`.
- **Context loaded:** `docs/overview/concepts.mdx`, `.claude/review-harness.md`
- **Prior findings:**
  - **Finding:** No tests asserting `.cause` is preserved. **Status: FIXED.** Commit `e74f097` added cause assertions to all 3 JWT-verification error paths (invalid format, expired, invalid signature) plus a negative assertion for the schema-validation path. Verified by reading the full test file and confirming all 4 error tests now assert on `.cause`. Tests pass.

## Pass 0.5: Scope Check
**Task:** Preserve the original error as `.cause` when `verifyPaymentRequestToken` wraps JWT verification failures in `InvalidPaymentRequestTokenError`.
**Verdict:** PASS | **Confidence:** HIGH

- `packages/ack-pay/src/errors.ts` -- Added `options?: ErrorOptions` parameter and forwarded to `super()`. Directly required.
- `packages/ack-pay/src/verify-payment-request-token.ts` -- Changed `catch (_err)` to `catch (err)` and passed `{ cause: err }`. Directly required.
- `packages/ack-pay/src/verify-payment-request-token.test.ts` -- Updated all error-path tests to assert `.cause` preservation and error type. Directly required.

No speculative code. No drive-by refactors. No feature extras. Every changed line maps to the stated task.

## Pass 1: Comprehension Check
**Verdict:** UNDERSTOOD | **Confidence:** HIGH

### `InvalidPaymentRequestTokenError` constructor (errors.ts:1-6)
**What it does:** Custom error class that accepts an optional message (defaulting to "Invalid payment request token") and optional `ErrorOptions` (which can carry `cause`). Passes both to the native `Error` constructor via `super(message, options)`.
**Branches:** None.
**Inputs:** message (string), options (ErrorOptions). **Output:** Error instance with `.name` set.

### `verifyPaymentRequestToken` catch block (verify-payment-request-token.ts:46-48)
**What it does:** Catches any error thrown by `verifyJwt()` and re-throws it wrapped in `InvalidPaymentRequestTokenError`, passing the caught error as `.cause` via `{ cause: err }`. The `undefined` first argument uses the default message.
**Branches:**
1. `verifyJwt` succeeds -> continues to schema validation (line 50).
2. `verifyJwt` throws -> caught, re-thrown as `InvalidPaymentRequestTokenError` with cause (line 47).
3. Schema validation fails -> `InvalidPaymentRequestTokenError` thrown without cause (line 56-58).
4. Schema validation succeeds -> returns `{ paymentRequest, parsed }` (line 61-64).

### Test changes (verify-payment-request-token.test.ts)
All error-path tests now use `.catch((e) => e)` pattern instead of `rejects.toThrow()`, enabling inspection of the error object's properties. Three tests verify `.cause` is defined and is an `Error` instance. One test verifies `.cause` is `undefined` for schema validation failures (correct -- no caught error to wrap).

## Pass 2: Contract & Integration
**Verdict:** PASS | **Confidence:** HIGH

- **Constructor signature:** `ErrorOptions` is optional with no default. All existing call sites that construct `InvalidPaymentRequestTokenError()` without options continue to work unchanged. The schema-validation throw at line 56 passes only a message string, which still works.
- **Cross-package consumers:**
  - `tools/api-utils/src/middleware/error-handler.ts` -- uses `instanceof` check only. Unaffected.
  - `tools/api-utils/src/api-response.ts` -- `formatErrorResponse` serializes only `error.message`. `.cause` is NOT serialized to API responses. No leak.
  - `packages/ack-pay/src/verify-payment-receipt.ts` (line 106) -- calls `verifyPaymentRequestToken` and lets errors propagate. Behavior unchanged; errors now carry richer cause info.
  - `demos/e2e/src/receipt-issuer.ts`, `demos/payments/src/payment-service.ts`, `demos/payments/src/receipt-service.ts`, `examples/issuer/src/routes/receipts.ts` -- all call `verifyPaymentRequestToken`. All let the error propagate or catch generically. No breakage.
  - `packages/agentcommercekit` re-exports `ack-pay`. Export surface unchanged.
- **Type compatibility:** `tsc -b` shows no new errors. `ErrorOptions` is a built-in TypeScript type (ES2022+).

## Pass 3: Failure & Adversarial
**Verdict:** PASS | **Confidence:** HIGH

- **Error exposure:** `formatErrorResponse` only serializes `error.message`, not `.cause`. The original JWT error (which could contain internal details about JWT structure, key IDs, etc.) is NOT exposed in API responses. It is available programmatically for server-side logging/debugging, which is the correct behavior for a fintech library.
- **No key material in cause:** The caught errors from `verifyJwt` are standard JWT verification errors (format issues, expiry, signature mismatch). These do not contain private key material.
- **Cryptographic correctness:** No changes to signing or verification logic. Only error wrapping modified.
- **Input validation:** Unchanged. Valibot schema validation on the parsed JWT payload remains intact.
- **Replay/idempotency:** Not affected by this change.

## Pass 4: Code Craft
**Verdict:** PASS | **Confidence:** HIGH

- **Single responsibility:** `errors.ts` defines the error class. `verify-payment-request-token.ts` uses it. Clean separation.
- **No duplication:** The `catch` pattern appears once.
- **Completeness across analogues:** The only throw site that wraps a caught error is the `verifyJwt` catch block (line 46-48). The schema validation throw (line 56-58) correctly does NOT set a cause because there is no underlying error to wrap. Both paths are correct.
- **No dead code:** All new code is exercised.
- **File size:** `errors.ts` is 6 lines. `verify-payment-request-token.ts` is 65 lines. Well under limits.
- **Naming:** Follows conventions (PascalCase class, camelCase function, kebab-case file).
- **Analogous error classes:** `CredentialVerificationError` and `DidResolutionError` in other packages do NOT accept `ErrorOptions`. This is a potential future improvement for those classes but is NOT a blocking concern for this PR -- those classes don't currently wrap caught errors in the same pattern.

## Pass 5: Test Quality
**Verdict:** PASS | **Confidence:** HIGH

- **Tests exist for new behavior:** All 3 error paths where `.cause` is set are tested:
  1. Invalid JWT format (line 82-94): Asserts `instanceof`, message, cause defined, cause is Error.
  2. Expired JWT (line 96-125): Asserts `instanceof`, cause defined, cause is Error.
  3. Invalid signature (line 159-184): Asserts `instanceof`, cause defined, cause is Error.
- **Negative case tested:** Schema validation failure (line 186-208): Asserts `instanceof`, message, and `cause` is `undefined`.
- **Would tests fail if code broke?** Yes. If `{ cause: err }` were removed from line 47, the `expect(error.cause).toBeDefined()` assertions would fail. If `_err` were used again (ignoring the error), cause would be undefined.
- **Crypto tested with real operations:** Tests use real `secp256k1` key generation, real JWT signing, real DID resolution. No mocking of crypto.
- **Wiring test:** The test imports and calls the actual `verifyPaymentRequestToken` function -- not a mock. The error class is imported from `./errors` which is the same module the implementation uses.
- **Prior review gap addressed:** The fix commit `e74f097` added exactly the missing assertions. All 4 error-path tests now verify `.cause` behavior. This is confirmed by reading the full test file and running the test suite (32 tests pass).

## Pass 6: System Fit
**Verdict:** PASS | **Confidence:** HIGH

- **Aligns with architecture:** Error wrapping with `.cause` is a standard JavaScript pattern (ES2022 `Error` cause). Preserving the original error aids debugging in payment verification flows.
- **Package cohesion:** Change is entirely within `ack-pay`, which is the correct package for payment request verification.
- **Observability:** The `.cause` chain now preserves the original error for logging. Server-side error handlers can access `err.cause` for diagnostics. This is a net improvement.
- **Rollback safety:** Fully backwards-compatible. The constructor parameter is optional. No consumer code changes required.
- **No new dependencies:** Uses built-in `ErrorOptions` type.

## Pass 7: What's Missing?
**Verdict:** PASS | **Confidence:** HIGH

- **Analogous code paths:** Checked `verify-payment-receipt.ts` -- it calls `verifyPaymentRequestToken` and lets errors propagate. The `CredentialVerificationError` and `DidResolutionError` classes in other packages do not currently accept `ErrorOptions`, but they also do not currently wrap caught errors in their constructors, so this is not a gap -- it would be an enhancement for a separate PR.
- **Error response consistency:** The `InvalidPaymentRequestTokenError` is thrown in exactly 2 places in `verify-payment-request-token.ts`: once with cause (line 47), once without (line 56-58). Both are tested. The `formatErrorResponse` function does not serialize `.cause`, maintaining consistent API response shape.
- **Documentation:** No user-facing behavior change. The error message and HTTP status are unchanged. No doc update needed.
- **Cleanup:** No dead code, unused imports, or stale comments.

## Summary (Fintech Bar)
- **Ship as-is:** Yes. All passes PASS at HIGH confidence. The change is minimal, correct, backwards-compatible, and fully tested. The prior review finding (missing cause assertions) has been addressed in commit `e74f097` with comprehensive test coverage across all error paths. No security gaps, no crypto changes, no payment logic changes -- only error diagnostic improvement.
- **Ship after fixes:** N/A
- **Do not ship:** N/A
- **Reviewer's blind spots:** None identified. The change surface is small and fully verified.
