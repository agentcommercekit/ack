# Review Harness

> **Fintech-grade review protocol.** This system handles autonomous agent payments, cryptographic identity credentials, and stablecoin transfers. Review standards reflect that reality.
>
> Run this on every PR before merge. Designed to be executed by both human review and agent review.
>
> **The bar:** If you would not deploy this change to a system that processes real money and cryptographic identity, it does not ship. Security gaps, untested crypto operations, and payment logic without verification are **blocking** — not follow-ups.

---

## How to Use

**Human:** Read the diff, then walk through each pass below in order. Each pass builds on the one before it — don't skip ahead. Focus your time on passes where the agent reports LOW confidence.

**Agent:** When asked to "review your work" or "run the harness," execute all passes against the current diff in order. Load system context from `docs/concepts.md` and `docs/code-craft.md` before starting. Produce the report as both:
1. **A file** written to `.reviews/REVIEW-{date}-{short-description}.md` (for audit trail)
2. **Conversation output** (for immediate discussion)

**Rules:**
1. Every factual claim must cite a file path and line number. If you can't cite it, you haven't verified it.
2. Automated gates must be run and their output recorded before the review is valid.
3. If a previous review exists for this PR, verify that all prior findings were addressed — don't take "fixed" on faith.
4. Passes are sequential. Each one depends on the understanding built in the previous pass. Do not skip or reorder.

---

## Pass 0: Evidence Ledger

*Prove you've done the work before claiming results.*

This pass exists because AI reviewers (including Claude) will assert things they haven't actually verified. The evidence ledger forces every claim to be backed by a specific file read, command output, or grep result.

| Requirement | What to record |
|-------------|---------------|
| Files read | List every source file read during this review, with line ranges. If a file wasn't read, claims about it are speculation. |
| Commands run | Record output of: `tsc -b` (types), `npm run eval:workflow` (deterministic baseline), and any other automated checks. If a gate wasn't run, the review is incomplete. |
| Context loaded | Confirm which system docs were read: `concepts.md`, `code-craft.md`, etc. |
| Prior review findings | If this is a follow-up review: list each finding from the previous run and whether it was verified as fixed (with evidence, not just "looks good"). |

**Format:** Keep this section concise — a bullet list of files and commands, not a narrative.

---

## Pass 0.5: Scope Check

*Does this diff contain only what was asked for?*

This pass exists because AI-generated code tends to expand beyond the request — adding helpers nobody asked for, refactoring adjacent code, introducing abstractions "for future use." Every line in the diff should trace back to the stated task.

| Check | How to verify |
|-------|--------------|
| Task → diff mapping | State what was requested in one sentence. Then list every file in the diff and explain why it was changed. Any file that doesn't map to the request is scope creep. |
| No speculative code | Every new function, type, export, and file is used by this PR. Nothing is added "because we'll need it later." |
| No drive-by refactors | Code adjacent to the change was not reformatted, renamed, or restructured unless that was the task. A bug fix doesn't come with a cleanup. |
| No feature extras | The change does what was asked, not what the author thought would be nice to also include. One PR, one purpose. |

**Verdict:** PASS / BLOAT (list what doesn't belong)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 1: Comprehension Check

*Can you explain what this code actually does, line by line?*

This pass exists because the most dangerous review failure is approving code you don't understand. Reading code and understanding code are different things. This pass forces the reviewer to prove comprehension before moving to judgment.

**For each new or significantly modified function/block in the diff:**

1. **State what it does** in one plain sentence. Not what it's named — what the code actually does when you trace the logic.
2. **Trace the branches.** List every conditional path (if/else, early return, try/catch). For each branch, state what triggers it and what happens.
3. **Identify the inputs and outputs.** What goes in, what comes out, what side effects occur (DB writes, cache updates, external calls).

**The test:** Cover the function name. Read only the body. Could you name this function yourself? If your name matches the actual name, you understand the code. If not, either the name is misleading or your understanding is incomplete.

**Verdict:** UNDERSTOOD / UNCLEAR (list what you can't fully explain)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 2: Contract & Integration

*Does this change break something it doesn't touch?*

**Context to load:** `docs/concepts.md` (architecture), package boundaries in `packages/`

| Check | How to verify |
|-------|--------------|
| Package boundary respected | If a package changed: do its consumers still compile? Check which other packages in the monorepo import from it (`agent-core`, `mcp-banking`, `x402-gateway`, `a2a`, `demo`, `eval`). |
| Tool schema compatibility | If tool schemas changed (names, required fields, output shapes): will existing agents and eval suites still work? Does the deterministic baseline (`eval:workflow`) still pass? |
| Credential / DID format stable | If identity primitives changed (DID generation, ControllerCredential structure, JWT/VC format): do verification paths in all packages still accept the new format? |
| x402 protocol compliance | If payment flows changed: does the x402 handshake still conform to the protocol spec? (402 → payment header → receipt → retry) |
| Cross-package ripple | Which other packages import from the changed code? List them. Have they been checked? |

**Verdict:** PASS / FAIL (list broken contracts)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 3: Failure & Adversarial

*What happens when this code is attacked or when its dependencies fail?*

**Context to load:** `docs/concepts.md` (threat model — agent identity, payment flows)

| Check | How to verify |
|-------|--------------|
| Input validation | Every new user/agent-facing input has validation (Zod or equivalent). No raw field access without schema check. Tool arguments validated before execution. |
| Cryptographic correctness | Signing, verification, key derivation — are the right algorithms used? Are signatures verified before trusting claims? Are nonces/JTIs unique? |
| Credential verification | ControllerCredentials and VCs: is the signature checked? Is the issuer trusted? Is expiry enforced? Can a revoked credential still be used? |
| Payment safety | Can an agent be tricked into overpaying? Can a receipt be forged or replayed? Is the payment amount verified against the request? |
| Error exposure | Error responses don't leak private keys, internal state, or implementation details. Stack traces sanitized in production. |
| External dependency failure | Every `await` to an external service (blockchain RPC, LLM API, MCP server) has a failure path. What happens on timeout? Rate limit? Malformed response? |
| Key material handling | Private keys never logged, never in error messages, never serialized to unprotected storage. Ephemeral keys cleaned up. |
| Replay / idempotency | If a payment or credential presentation is sent twice, does it produce the correct result? Are nonces enforced? |

**Verdict:** PASS / CONCERN (list each concern with severity)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 4: Code Craft

*Is this code going to be maintainable as the system grows?*

**Context to load:** `docs/code-craft.md` (file org, SRP, Open/Closed, DI, DRY, composition over inheritance)

| Check | How to verify |
|-------|--------------|
| Single responsibility | Each changed file does one thing. If you need "and" to describe it, it should be split. |
| No duplication | Same logic doesn't appear in multiple places. If a pattern appears 3+ times, extract it. |
| Completeness across analogues | For every behavior added to one code path, verify it was added to all analogous code paths. |
| No dead code | Every new function/export is called. No "for future use" code ships. |
| File size | No file exceeds 500 lines. Files approaching 250 should be evaluated for splitting. |
| Data and logic separated | Schemas, test cases, and configuration are data files. Validation, execution, and formatting are logic files. |
| Error handling is appropriate | Tools return `{ isError: true }` results, not thrown exceptions. Validation errors are structured, not strings. Fail-open vs fail-closed is intentional and documented. |
| Naming | Files: kebab-case. Functions: camelCase, verb-first. Types: PascalCase. Constants: camelCase for objects, UPPER_CASE for primitives. |
| Open/Closed | Can a new tool or agent be added without modifying existing validation, runner, or agent code? |
| Abstraction earns its keep | New helpers/utilities are called from multiple places. If called once, inline it. |
| Future reader test | If someone opens this file in 3 months, will they understand what's happening and *why* without reading the conversation that produced it? Are non-obvious decisions explained where they're made? |

**Verdict:** PASS / REFACTOR (list items)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 5: Test Quality

*Do the tests actually prove the code works, or do they just exist?*

**Context to load:** `docs/code-craft.md` (testing strategy — unit, integration, eval)

| Check | How to verify |
|-------|--------------|
| Tests exist for new behavior | Every new code path has at least one test. Not just happy path — at least one failure/edge case. |
| Tests verify behavior, not implementation | Tests assert on outputs and side effects, not on how the code achieves them. Mocking is minimal and at boundaries only. |
| Tests would fail if the code broke | Flip the logic mentally — if you reversed an `if` condition, would a test catch it? If not, the test is shallow. |
| No false confidence | Tests that always pass (testing constants, testing mocks return what you told them to) don't count. |
| Deterministic baseline preserved | Does `npm run eval:workflow` still pass? This is the regression gate. |
| Crypto tested with real operations | Don't mock cryptographic operations. The point is testing real signatures, real JWTs, real key derivation. |
| Wiring test | If someone deleted the new code from its integration point, would any test fail? If not, the feature is tested in isolation but not proven to be connected. |
| Eval coverage | For LLM-facing changes: do the eval suites (`eval:workflow:llm`) still produce reasonable results? (Informational, not a gate.) |

**Verdict:** PASS / GAPS (list missing test scenarios)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 6: System Fit

*Does this change make the overall system better or worse?*

**Context to load:** `docs/concepts.md` (architecture), `package.json` (workspace structure)

| Check | How to verify |
|-------|--------------|
| Aligns with architecture | Does this follow the established patterns? (tool schemas → validator → runner → executor, DID-based identity, x402 payment protocol) |
| Package cohesion | Is the code in the right package? `agent-core` for primitives, `mcp-banking` for MCP tools, `x402-gateway` for payment, `a2a` for agent-to-agent, `eval` for testing. |
| Observability | Can you tell this code ran? Is there logging for failures? Are audit trails maintained for payments and credential operations? |
| Rollback safety | If this deploy/release fails, can you roll back without breaking consumers? Are changes backwards-compatible? |
| Config vs code | Are environment-specific values (RPC URLs, API keys, network selection) in env vars, not hardcoded? |
| Dependency hygiene | New dependencies: are they necessary? Are they maintained? Do they have known CVEs? Is the dependency a good fit for a crypto/payment library (supply chain risk)? |

**Verdict:** PASS / FLAG (list concerns)
**Confidence:** HIGH / MEDIUM / LOW

---

## Pass 7: What's Missing?

*What should be in this diff but isn't?*

This pass exists because reviewers (human and AI) naturally focus on what's present in the diff. The most dangerous bugs are the ones where you did the right thing in one place and forgot to do it everywhere else.

| Check | How to verify |
|-------|--------------|
| Analogous code paths | List every code path analogous to the one changed. Verify each was updated. |
| Error response consistency | If a new error shape was added, is it returned the same way everywhere? Same structure, same fields? |
| Documentation | If behavior changed: was `concepts.md`, `code-craft.md`, or the README updated? |
| Config / env | If a new feature has tunable parameters: are they in the right config layer? Documented in `.env.example`? |
| Cleanup | Did the change leave behind any dead code, unused imports, or stale comments from a previous iteration? |

**Verdict:** PASS / MISSING (list what's absent)
**Confidence:** HIGH / MEDIUM / LOW

---

## Report Output

When the harness is run, produce the report in **two places**:

1. **File:** Write to `.reviews/REVIEW-{YYYY-MM-DD}-{short-description}.md`
2. **Conversation:** Output the same content in the chat for immediate discussion.

Use this template:

```markdown
# Review: [PR title or change description]

**Date:** [YYYY-MM-DD]
**PR:** [link or branch name]
**Reviewer:** [Claude / Alex / both]
**Harness version:** v3

---

## Pass 0: Evidence Ledger
- **Files read:** [list with line ranges]
- **Commands run:** [tsc, eval:workflow, etc. with pass/fail]
- **Context loaded:** [which docs]
- **Prior findings:** [if follow-up: list each and verification status]

## Pass 0.5: Scope Check
**Task:** [one sentence: what was requested]
**Verdict:** [PASS/BLOAT] | **Confidence:** [HIGH/MEDIUM/LOW]
[File-by-file justification, or list of what doesn't belong]

## Pass 1: Comprehension Check
**Verdict:** [UNDERSTOOD/UNCLEAR] | **Confidence:** [HIGH/MEDIUM/LOW]

[For each function/block: plain-English description, branches, inputs/outputs]

## Pass 2: Contract & Integration
**Verdict:** [PASS/FAIL] | **Confidence:** [HIGH/MEDIUM/LOW]
[Findings, if any]

## Pass 3: Failure & Adversarial
**Verdict:** [PASS/CONCERN] | **Confidence:** [HIGH/MEDIUM/LOW]
[List of concerns with severity: CRITICAL / HIGH / MEDIUM / LOW]

## Pass 4: Code Craft
**Verdict:** [PASS/REFACTOR] | **Confidence:** [HIGH/MEDIUM/LOW]
[Items to improve]

## Pass 5: Test Quality
**Verdict:** [PASS/GAPS] | **Confidence:** [HIGH/MEDIUM/LOW]
[Missing test scenarios]

## Pass 6: System Fit
**Verdict:** [PASS/FLAG] | **Confidence:** [HIGH/MEDIUM/LOW]
[Concerns]

## Pass 7: What's Missing?
**Verdict:** [PASS/MISSING] | **Confidence:** [HIGH/MEDIUM/LOW]
[What should be in the diff but isn't]

## Summary (Fintech Bar)
- **Ship as-is:** [yes/no — requires all passes PASS at HIGH confidence, zero security gaps, all crypto/payment features tested]
- **Ship after fixes:** [list required fixes — security and payment safety issues are ALWAYS required fixes, never follow-ups]
- **Do not ship:** [architectural concerns, crypto/payment safety gaps indicating deeper problems, or insufficient test coverage for critical paths]
- **Reviewer's blind spots:** [areas where confidence is LOW — human MUST verify before shipping]
```
