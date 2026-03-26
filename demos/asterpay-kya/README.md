# ACK-ID: AsterPay KYA Trust Score Demo

This demo shows how [AsterPay](https://asterpay.io) KYA (Know Your Agent) Trust Score tokens integrate with ACK-ID's identity infrastructure. AsterPay provides a 5-layer trust verification framework for AI agent payments: VERIFY → SCREEN → SCORE → ATTEST → COMPLY.

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

### Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:asterpay-kya
```

Alternatively, you can run the demo from this directory (`./demos/asterpay-kya`) with:

```sh
pnpm run demo
```

## What is ACK-ID?

ACK-ID is a protocol built on W3C Standards that provides verifiable, secure identity infrastructure for agents. It uses DIDs (Decentralized Identifiers) and Verifiable Credentials to establish trust and enable agent-to-agent commerce. ACK-ID serves as the core identity layer that other agent systems can build upon.

## What is AsterPay KYA?

AsterPay's Know Your Agent (KYA) framework provides trust scoring and verification for AI agents. KYA tokens are JWT-based credentials that contain:

- **Trust Score** (0-100): Composite score from 7 on-chain and off-chain signals
- **Tier Classification**: Open, Verified, Trusted, or Enterprise
- **Score Components**: Wallet Age, Transaction Activity, Sanctions Screening, ERC-8004 Identity, Operator KYB, Payment History, Trust Bond
- **InsumerAPI Attestations**: Third-party ES256-signed attestations for Coinbase KYC, country verification, Gitcoin Passport, and USDC balance
- **Sanctions Screening**: Chainalysis-powered sanctions check
- **Cryptographic Proof**: ES256 JWT signature from AsterPay's infrastructure

## How AsterPay KYA Works with ACK-ID

This demo demonstrates how KYA Trust Score tokens leverage ACK-ID's infrastructure:

1. **Native Compatibility**: KYA JWTs convert to standard W3C Verifiable Credentials
2. **Cryptographic Integrity**: Bidirectional conversion preserves original signatures with perfect fidelity
3. **Trust-Score-Aware Verification**: ACK-ID verifiers can set minimum trust score thresholds
4. **ERC-8183 Integration**: IACPHook gates agent commerce jobs using trust score verification

## Demo Flow

### 1. KYA Trust Score Token Creation

- Creates an AsterPay KYA token with trust score, 7 scoring components, InsumerAPI attestations, and sanctions screening result
- Simulates what AsterPay's API returns at `GET /v1/agent/trust-score/:address`

### 2. JWT to Verifiable Credential Conversion

- Converts the KYA JWT to a W3C Verifiable Credential
- Preserves all original JWT data and cryptographic signatures
- Generates an ACK-ID compatible DID: `did:web:api.asterpay.io:agent:{address}`
- Extracts trust score, tier, components, and attestation data

### 3. Bidirectional Conversion

- Demonstrates perfect fidelity conversion back to original JWT format
- Proves cryptographic integrity is maintained throughout the process
- Verifies `original JWT === reconstructed JWT`

### 4. ACK-ID Verification with Trust Score Gate

- Verification with configurable minimum trust score thresholds
- Automatic sanctions status checking
- Trusted issuer validation
- Shows PASS/BLOCK scenarios for different thresholds

### 5. ERC-8183 IACPHook Simulation

- Simulates an ERC-8183 Agentic Commerce Protocol job
- Runs 5-shield verification: VERIFY → SCREEN → SCORE → ATTEST → COMPLY
- Demonstrates how trust scores gate agent access to commerce jobs

## Technical Implementation

### Verifiable Credential Structure

The demo creates a Verifiable Credential containing the full KYA trust data:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://agentcommercekit.com/contexts/asterpay-kya/v1"
  ],
  "type": ["VerifiableCredential", "AsterPayKYACredential", "AgentTrustScoreCredential"],
  "issuer": { "id": "did:web:api.asterpay.io" },
  "credentialSubject": {
    "id": "did:web:api.asterpay.io:agent:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    "trustScore": 82,
    "tier": "trusted",
    "components": {
      "walletAge": 12,
      "transactionActivity": 11,
      "sanctionsScreening": 15,
      "ercIdentity": 15,
      "operatorKyb": 10,
      "paymentHistory": 9,
      "trustBond": 10
    },
    "insumerAttestation": {
      "coinbaseKyc": { "met": true },
      "coinbaseCountry": { "met": true, "country": "EU" },
      "gitcoinPassport": { "met": true, "minScore": 20 },
      "tokenBalance": { "met": true, "chain": "base", "token": "USDC", "minBalance": "100" }
    },
    "sanctioned": false
  }
}
```

### DID Generation

The system generates a DID for the agent identity:

- **Agent DID**: `did:web:api.asterpay.io:agent:{address}`

### Trust Score Components

| Component | Max Score | Description |
|-----------|-----------|-------------|
| Wallet Age | 15 | How long the wallet has existed |
| Transaction Activity | 15 | On-chain transaction history |
| Sanctions Screening | 15 | Chainalysis sanctions clearance |
| ERC-8004 Identity | 15 | Registered agent identity on-chain |
| Operator KYB | 15 | Know Your Business verification |
| Payment History | 15 | Historical payment reliability |
| Trust Bond | 10 | Staked collateral for trust |

### Verification Flow

1. **JWT Verification**: Validates the KYA token signature using AsterPay's JWKS
2. **Trust Check**: Ensures AsterPay is in the trusted issuers list
3. **Expiration Check**: Validates token hasn't expired
4. **Sanctions Check**: Verifies agent is not sanctioned
5. **Trust Score Gate**: Checks score meets minimum threshold
6. **Attestation Check**: Validates Coinbase KYC attestation

## Sample Output

```txt
KYA Trust Score × ACK-ID Demo

✨ === AsterPay KYA Trust Score → ACK-ID Integration Demo === ✨

1. Creating AsterPay KYA Trust Score token...
✓ KYA token created

2. Converting KYA JWT to ACK-ID Verifiable Credential...
✓ Verifiable Credential created
   Trust Score: 82 / 100
   Tier: trusted

3. Demonstrating bidirectional conversion...
✓ Successfully converted VC back to JWT
   Original JWT matches reconstructed: true

4. Running ACK-ID verification with trust score gate...
   4a. minTrustScore=50: ✓ PASSED
   4b. minTrustScore=90: ✗ BLOCKED
   4c. Untrusted issuer: ✗ BLOCKED

5. Simulating ERC-8183 IACPHook with ACK-ID...
   ✅ VERIFY: ERC-8004 identity confirmed
   ✅ SCREEN: Chainalysis sanctions clear
   ✅ SCORE: Trust score 82 ≥ 50 minimum
   ✅ ATTEST: InsumerAPI — KYC, Country, Passport, USDC
   ✅ COMPLY: Tier "trusted" authorized
   ✓ IACPHook: APPROVED — Agent may fund the job

🎉 Demo complete
```

## Production Considerations

For production deployment:

1. **JWKS Endpoint**: Fetch AsterPay's current JWKS from `https://api.asterpay.io/.well-known/jwks.json`
2. **Trust Configuration**: Configure AsterPay as a trusted issuer in ACK-ID systems
3. **Score Thresholds**: Set appropriate minimum trust scores per use case
4. **Attestation Validation**: Verify InsumerAPI attestation signatures independently
5. **Sanctions Monitoring**: Implement real-time sanctions screening updates

## Learn More

- [Agent Commerce Kit](https://www.agentcommercekit.com) Documentation
- [ACK-ID](https://www.agentcommercekit.com/ack-id) Documentation
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) Specification
- [AsterPay](https://asterpay.io) — The Trust Layer for AI Agent Payments
- [InsumerAPI](https://insumermodel.com) — Third-party attestation provider
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — Agent Identity Standard
- [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) — Agentic Commerce Protocol
