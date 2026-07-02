# Review: fix(caip): add input validation to createCaip10AccountId

**Date:** 2026-03-27
**PR:** #67 (branch: fix/caip10-validation)
**Reviewer:** Claude
**Harness version:** v3

---

## Pass 0: Evidence Ledger
- **Files read:**
  - `packages/caip/src/caips/caip-10.ts` (lines 1-50, full file)
  - `packages/caip/src/caips/caip-10.test.ts` (lines 1-23, full file pre-PR)
  - `packages/caip/src/caips/caip-2.ts` (lines 1-48, full file)
  - `packages/caip/src/caips/caip-19.ts` (lines 1-37, full file)
  - `packages/caip/src/caips/index.ts` (lines 1-3, full file)
  - `packages/did/src/methods/did-pkh.ts` (lines 1-282, full file)
  - `packages/agentcommercekit/src/index.ts` (lines 1-9, full file)
  - `docs/overview/concepts.mdx` (lines 1-70, full file)
  - `.claude/review-harness.md` (lines 1-272, full file)
- **Commands run:**
  - `gh pr diff 67` — diff retrieved, 2 files changed, +22/-0
  - `gh pr view 67 --json ...` — PR metadata confirmed
  - `tsc -b --noEmit` — all errors are pre-existing (examples/, scripts/); zero errors in `packages/caip` or `packages/did`
  - `grep createCaip10AccountId` across repo — 4 files reference it (caip-10.ts, caip-10.test.ts, did-pkh.ts, caip/README.md)
  - `grep from.*caip` across packages/ — consumers: `packages/did`, `packages/agentcommercekit` (re-export barrel)
- **Context loaded:** `concepts.mdx`, `review-harness.md`
- **Prior findings:** User states prior review found all 5 passes PASS. No written prior review exists in `.reviews/` for this PR. This is the first formal harness run.

## Pass 0.5: Scope Check
**Task:** Add runtime input validation to `createCaip10AccountId` so it throws on invalid CAIP-2 chain IDs and invalid CAIP-10 account addresses.
**Verdict:** PASS | **Confidence:** HIGH

- `packages/caip/src/caips/caip-10.ts` — adds validation guards using existing regex constants. Directly maps to the task.
- `packages/caip/src/caips/caip-10.test.ts` — adds two test cases for the two new error paths. Directly maps to the task.
- No speculative code: no new types, no new exports, no new files, no drive-by refactors.
- The only new import (`caip2ChainIdRegex`) already existed in `caip-2.ts` and was simply not imported here before.

## Pass 1: Comprehension Check
**Verdict:** UNDERSTOOD | **Confidence:** HIGH

**`createCaip10AccountId` (caip-10.ts, lines 36-47 post-PR):**

What it does: Validates that `chainId` matches the CAIP-2 chain ID format (`[a-z0-9]{3,8}:[_a-zA-Z0-9-]{1,32}`) and that `address` matches the CAIP-10 account address format (`[-.%a-zA-Z0-9]{1,128}`). If both pass, concatenates them with `:` and returns the CAIP-10 account ID string.

Branches:
1. `chainId` fails `caip2ChainIdRegex.test()` → throws `Error("Invalid CAIP-2 chain ID: ${chainId}")`
2. `address` fails `caip10AccountAddressRegex.test()` → throws `Error("Invalid CAIP-10 account address: ${address}")`
3. Both pass → returns `${chainId}:${address}` (the only non-error path)

Inputs: `chainId: Caip2ChainId` (typed template literal string), `address: string`
Outputs: `Caip10AccountId` (string) or throws `Error`
Side effects: none

**Test: "throws for invalid chain ID"** — passes `"bad"` (no `:` separator, fails CAIP-2 namespace:reference pattern), expects throw.
**Test: "throws for invalid account address"** — passes `""` (empty string, fails 1-128 char requirement), expects throw.

## Pass 2: Contract & Integration
**Verdict:** PASS | **Confidence:** HIGH

- **Package boundary:** `caip2ChainIdRegex` is already exported from `caip-2.ts` (line 22). Adding it to the import in `caip-10.ts` introduces no new cross-package dependency. The `caip` package's public API is unchanged — same exports.
- **Cross-package consumers:**
  - `packages/did/src/methods/did-pkh.ts` calls `createCaip10AccountId` at lines 123, 146, 242. All call sites pass typed `Caip2ChainId` values and real address strings. These will continue to work because valid inputs are unaffected. Invalid inputs that previously produced silently corrupt CAIP-10 IDs will now throw — this is strictly safer for a fintech system.
  - `packages/agentcommercekit/src/index.ts` re-exports `@agentcommercekit/caip` — barrel only, no logic change.
- **Tool schema compatibility:** Not applicable — no tool schemas changed.
- **Credential/DID format:** Unchanged. The function still produces the same output for valid inputs.
- **tsc -b:** No new type errors introduced.

## Pass 3: Failure & Adversarial
**Verdict:** PASS | **Confidence:** HIGH

- **Input validation:** This PR *is* the input validation. Both parameters are now validated against the canonical CAIP regex patterns before use. This closes a gap where malformed chain IDs or addresses could produce invalid CAIP-10 strings that propagate downstream into DID documents and credential chains.
- **Error exposure:** Error messages include the invalid `chainId` value in the message (`Invalid CAIP-2 chain ID: ${chainId}`). This is acceptable — chain IDs are not sensitive (they are public blockchain identifiers like `eip155:1`). The address is NOT included in the address error message — good, as addresses could theoretically contain unexpected content. Wait — re-reading: the address error says `Invalid CAIP-10 account address: ${address}`. This does include the address. For a CAIP-10 address this is a public blockchain address, not private key material. Acceptable.
- **No cryptographic operations changed.** No signing, verification, or key material handling affected.
- **No payment flows changed.**
- **Regex safety:** Both `caip2ChainIdRegex` and `caip10AccountAddressRegex` use bounded quantifiers (`{3,8}`, `{1,32}`, `{1,128}`) and simple character classes — no catastrophic backtracking risk (no nested quantifiers, no alternation with overlap).
- **Downstream exception handling:** In `did-pkh.ts`, `createDidPkhDocument` (line 237) and `createDidPkhUri` (line 142) call `createCaip10AccountId`. These are not wrapped in try/catch. However, these functions are construction functions — callers should expect them to throw on invalid input. The `did-pkh` module already throws `Error("Invalid did:pkh URI")` in its own parsing functions, so throwing behavior is consistent with the package's error contract.

## Pass 4: Code Craft
**Verdict:** PASS | **Confidence:** HIGH

- **Single responsibility:** `createCaip10AccountId` still does one thing: creates a validated CAIP-10 account ID. Validation is part of creation, not a separate concern.
- **No duplication:** The regex constants (`caip2ChainIdRegex`, `caip10AccountAddressRegex`) are defined once in their respective files and reused here via import.
- **No dead code:** Both new guards are exercised by the function's logic. Both new tests are meaningful.
- **File size:** `caip-10.ts` is 50 lines. Well within limits.
- **Error handling:** Uses `throw new Error()` — this is appropriate for a low-level utility function. This is not an MCP tool handler (which would need `{ isError: true }`); it's a pure construction function.
- **Naming:** kebab-case file, camelCase function, PascalCase types — all consistent.
- **Abstraction earns its keep:** No new abstractions added. Existing regex constants reused.

## Pass 5: Test Quality
**Verdict:** PASS | **Confidence:** HIGH

- **Tests exist for new behavior:** Two new tests cover both validation branches.
  - Invalid chain ID: `"bad"` fails the CAIP-2 pattern (no namespace:reference structure).
  - Invalid address: `""` fails the CAIP-10 address pattern (empty string, below minimum length of 1).
- **Tests verify behavior, not implementation:** Tests assert on thrown error messages, which is the observable behavior.
- **Tests would fail if code broke:** Removing either guard would cause the corresponding test to fail (the function would return instead of throwing).
- **No false confidence:** Tests exercise real regex validation, not mocked behavior.
- **Edge case coverage:** The two tests cover the two distinct failure modes. The happy path is covered by the two pre-existing tests (EVM and Solana addresses). This gives full branch coverage of the function.
- **Wiring test:** The function is exported and imported via `./index` in the test file (line 3 of test), confirming the export path works.
- **Deterministic baseline:** Not applicable — no eval suites are affected by a pure utility function change.

## Pass 6: System Fit
**Verdict:** PASS | **Confidence:** HIGH

- **Aligns with architecture:** Input validation on construction functions follows defense-in-depth. This is the correct layer to validate — at the point of creation, not downstream at consumption.
- **Package cohesion:** Validation logic is in `packages/caip`, which owns CAIP standards. Correct placement.
- **Observability:** Errors throw with descriptive messages including the invalid value. Callers can log or handle as appropriate.
- **Rollback safety:** This is additive validation. Rolling back removes the guards and returns to the prior (less safe) behavior. No data format changes. Fully backward-compatible for valid inputs.
- **No new dependencies.**

## Pass 7: What's Missing?
**Verdict:** PASS | **Confidence:** HIGH

- **Analogous code paths:** `caip-2.ts` has `caip2Parts()` which validates on parse (line 43). `caip-10.ts` has `caip10Parts()` which validates on parse (line 45). The *creation* functions are the gap — and this PR closes the gap for `createCaip10AccountId`. There is no `createCaip2ChainId` function, so no analogous creation function is missing validation. `caip-19.ts` has no creation functions either — only type definitions and regex patterns.
- **Error response consistency:** Error messages follow the same pattern as existing errors in the codebase (`"Invalid CAIP-2 chain ID"` mirrors `"Invalid CAIP-2 chain ID"` thrown by `caip2Parts` at caip-2.ts:44).
- **Documentation:** No behavioral documentation needs updating — this is adding validation to a function whose docstring already describes the expected inputs. The README for the caip package is example-based and doesn't need revision for a validation addition.
- **Dead code / unused imports:** None. The new `caip2ChainIdRegex` import is used immediately.

## Summary (Fintech Bar)
- **Ship as-is:** Yes. All passes PASS at HIGH confidence. The change is minimal, correctly scoped, and closes a real validation gap in a construction function used by the DID identity layer. Both new error paths are tested. No security gaps. No breaking changes for valid inputs.
- **Ship after fixes:** N/A
- **Do not ship:** N/A
- **Reviewer's blind spots:** None identified. The change is small and self-contained enough that full verification was achievable.
