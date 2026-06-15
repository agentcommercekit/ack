# Insumer wallet-state attestations in ACK

Consume an **InsumerAPI** wallet-state attestation as a verifiable claim — so an
ACK service can gate access on *live on-chain wallet state*, not just identity or
proof-of-payment. Mirrors [`demos/skyfire-kya`](../skyfire-kya).

## Why

ACK-ID attests *who* an agent is, and ACK-Pay confirms a payment cleared — but
nothing checks the **paying wallet's on-chain state** before settlement: no
balance, holdings, or compliance condition on the payer.

InsumerAPI fills that gap. `POST /v1/attest` reads on-chain wallet state,
evaluates it against your conditions (token balance ≥ X, NFT ownership, EAS
attestation) across 37 chains, and returns an **ES256-signed boolean** — a
portable attestation anyone can verify offline with a public key.

## The key property

- **Verifying needs no secret.** Verification runs through the canonical
  [`insumer-verify`](https://www.npmjs.com/package/insumer-verify) SDK — it checks
  the ECDSA P-256 signature, the condition-hash binding, and expiry (and block
  freshness when you pass `maxAge`) against the public JWKS at
  `https://insumermodel.com/.well-known/jwks.json`. Verify offline; no key, nothing shared.
- **Only *minting* needs a key.** Requesting a fresh attestation calls
  `POST /v1/attest` with your own `X-API-Key`.

## Run

```bash
# verify the bundled sample (no key)
pnpm demo

# mint fresh + verify + gate green
INSUMER_API_KEY=insr_live_... pnpm demo
```

Get a free key (no signup, one call):

```bash
curl -X POST https://api.insumermodel.com/v1/keys/create \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","appName":"ack-demo","tier":"free"}'
```

Attestations are valid 30 minutes by design; once the bundled sample's window
passes, the demo shows the expiry rejection (proving the expiry check).

## What `granted` proves — and what it doesn't

A granted attestation proves, cryptographically and offline, that **the subject
wallet satisfied the condition** at a recent block — signed by InsumerAPI,
verifiable with the public key alone.

It is a **bearer** proof: it binds the *subject wallet* (`sub`), not whoever
presents it. Exactly like `skyfire-kya`, presenter-binding — proving the agent in
*this* session controls that wallet — is the job of the surrounding ACK session /
DID-auth layer (the same layer the native path below routes through). Treat
`granted: true` as *"a valid wallet-state attestation exists for this wallet,
inside its 30-minute window"* and compose it with your agent-session auth. A
holder-of-key (`cnf`) proof-of-possession binding is the upgrade path if you need
the attestation itself to be non-replayable.

## Two integration paths

1. **Adapter (this demo) — works today, no fork.** Verify the attestation against
   the public JWKS and gate on the boolean, the way `skyfire-kya` does.
2. **Native verifier — an upstream option.** ACK's `verifyParsedCredential()`
   resolves the issuer through a DID resolver and expects a `JwtProof2020` proof.
   To flow natively through that path, InsumerAPI would publish a
   `did:web:api.insumermodel.com` document and emit VC-shaped output; then
   `getWalletStateClaimVerifier()` (in `src/insumer-ack-id.ts`) slots into
   `verifyParsedCredential({ verifiers })` alongside ACK's own claim verifiers.

## Boundary

This demo is a **consumer of InsumerAPI's documented public surface** only
(`openapi.yaml` + the public JWKS). `conditionHash` is treated as an opaque
fingerprint and never recomputed. How state is sourced, how conditions are
evaluated, and how attestations are signed all stay server-side.

It is in production today gating settlement for a Circle Alliance member building
payments for the agentic economy.
