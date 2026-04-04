import {
  colors,
  errorMessage,
  log,
  logJson,
  successMessage,
  waitForEnter,
} from "@repo/cli-tools"
import type { JwtString, Verifiable, W3CCredential } from "agentcommercekit"
import type * as jose from "jose"

import { generateJwks } from "./jwk-keys"
import { createMockAsterPayKyaToken } from "./kya-token"
import {
  convertAsterPayKyaToVerifiableCredential,
  convertVerifiableCredentialToAsterPayKya,
  getAgentDidFromVC,
  getInsumerAttestationFromVC,
  getTierFromVC,
  getTrustScoreFromVC,
  isSanctionedFromVC,
  verifyAsterPayKyaAsAckId,
  type AsterPayKyaCredentialSubject,
  type AsterPayVerificationResult,
} from "./asterpay-kya-ack-id"

async function runDemo() {
  const { jwks, keypair } = await generateJwks()

  log(`
     _        _            ____              
    / \\   ___| |_ ___ _ __|  _ \\ __ _ _   _ 
   / _ \\ / __| __/ _ \\ '__| |_) / _\` | | | |
  / ___ \\\\__ \\ ||  __/ |  |  __/ (_| | |_| |
 /_/   \\_\\___/\\__\\___|_|  |_|   \\__,_|\\__, |
                                       |___/ 
       KYA Trust Score × ACK-ID Demo
  `)

  log("✨ === AsterPay KYA Trust Score → ACK-ID Integration Demo === ✨\n")

  log(`📝 Overview:
   AsterPay's Know Your Agent (KYA) framework provides a 5-layer trust
   verification system for AI agents: VERIFY → SCREEN → SCORE → ATTEST → COMPLY.

   The Trust Score (0-100) combines 7 on-chain and off-chain signals including
   cryptographically signed attestations from InsumerAPI (Coinbase KYC,
   country verification, Gitcoin Passport, USDC balance).

   This demo shows how AsterPay KYA tokens integrate with ACK-ID:
   • AsterPay Trust Score JWT → W3C Verifiable Credential conversion
   • Bidirectional conversion with full cryptographic integrity
   • ACK-ID verification with trust score thresholds and sanctions checks
   • ERC-8183 IACPHook gate simulation using ACK-ID infrastructure
`)
  await waitForEnter("Press Enter to start the demo...")

  // Step 1: Create KYA token
  log(
    `In this first step, we create an AsterPay KYA token containing the agent's
trust score, 7 scoring components, InsumerAPI attestations (4 conditions),
and sanctions screening result. This is what AsterPay's API returns at
GET /v1/agent/trust-score/:address\n`,
  )
  await waitForEnter()

  log("1. Creating AsterPay KYA Trust Score token...\n")

  const kyaToken = await createMockAsterPayKyaToken(keypair)
  log(successMessage("\nKYA token created"))
  log(colors.dim(kyaToken), { wrap: false })

  // Step 2: Convert to ACK-ID VC
  log(
    `\nNext, we convert the AsterPay KYA JWT into an ACK-ID compatible
Verifiable Credential. This creates a W3C standard VC that any ACK-compatible
service can verify — without contacting AsterPay directly.\n`,
  )
  await waitForEnter()

  log("2. Converting KYA JWT to ACK-ID Verifiable Credential...\n")

  let vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>
  try {
    vc = await convertAsterPayKyaToVerifiableCredential(jwks, kyaToken)
    log(successMessage("Verifiable Credential created:"))
    logJson(vc)

    const att = getInsumerAttestationFromVC(vc)
    log(`
Details:
   Agent DID: ${colors.magenta(getAgentDidFromVC(vc))}
   Trust Score: ${colors.magenta(String(getTrustScoreFromVC(vc)))} / 100
   Tier: ${colors.magenta(getTierFromVC(vc))}
   Sanctioned: ${colors.magenta(String(isSanctionedFromVC(vc)))}

   InsumerAPI Attestations (3rd-party, ES256-signed):
   ✅ Coinbase KYC: ${att.coinbaseKyc.met ? "verified" : "not verified"}
   ✅ Country: ${att.coinbaseCountry.country} (${att.coinbaseCountry.met ? "verified" : "not verified"})
   ✅ Gitcoin Passport: score ≥ ${att.gitcoinPassport.minScore} (${att.gitcoinPassport.met ? "met" : "not met"})
   ✅ USDC Balance: ≥ ${att.tokenBalance.minBalance} on ${att.tokenBalance.chain} (${att.tokenBalance.met ? "met" : "not met"})

   Trust Score Components:
   • Wallet Age: ${vc.credentialSubject.components.walletAge}/15
   • Transaction Activity: ${vc.credentialSubject.components.transactionActivity}/15
   • Sanctions Screening: ${vc.credentialSubject.components.sanctionsScreening}/15
   • ERC-8004 Identity: ${vc.credentialSubject.components.ercIdentity}/15
   • Operator KYB: ${vc.credentialSubject.components.operatorKyb}/15
   • Payment History: ${vc.credentialSubject.components.paymentHistory}/15
   • Trust Bond: ${vc.credentialSubject.components.trustBond}/10
`)
  } catch (error: unknown) {
    log(errorMessage("Conversion failed"))
    log(colors.dim(String(error)))
    throw error
  }

  // Step 3: Bidirectional conversion
  log(
    `Now we demonstrate that the conversion maintains full cryptographic
integrity by converting the VC back to the original JWT format.\n`,
  )
  await waitForEnter()

  log("3. Demonstrating bidirectional conversion...\n")

  try {
    const reconstructedJwt = convertVerifiableCredentialToAsterPayKya(vc)
    log(`${successMessage("Successfully converted VC back to JWT:")}

   Original JWT matches reconstructed: ${colors.magenta(kyaToken === reconstructedJwt ? "true" : "false")}`)
    log(`   Reconstructed JWT:`)
    log(colors.dim(reconstructedJwt), { wrap: false })
  } catch (error: unknown) {
    log(errorMessage("Bidirectional conversion failed"))
    log(colors.dim(String(error)))
    throw error
  }

  // Step 4: ACK-ID verification with trust score gate
  log(
    `\nNext, we verify the KYA token using ACK-ID's verification infrastructure.
AsterPay adds trust-score-aware verification: the verifier can set a minimum
score threshold and the system automatically checks sanctions status.\n`,
  )
  await waitForEnter()

  log("4. Running ACK-ID verification with trust score gate...\n")

  log("   4a. Verification with minTrustScore=50 (should PASS)...")
  const result1 = await verifyAsterPayKyaAsAckId(
    jwks,
    kyaToken,
    ["did:web:api.asterpay.io"],
    50,
  )
  if (result1.valid) {
    log(
      successMessage(
        `   PASSED — Score: ${result1.trustScore}, Tier: ${result1.tier}`,
      ),
    )
  } else {
    log(errorMessage(`   FAILED — ${result1.reason}`))
  }

  log("\n   4b. Verification with minTrustScore=90 (should FAIL)...")
  const result2 = await verifyAsterPayKyaAsAckId(
    jwks,
    kyaToken,
    ["did:web:api.asterpay.io"],
    90,
  )
  if (result2.valid) {
    log(successMessage(`   PASSED — Score: ${result2.trustScore}`))
  } else {
    log(
      errorMessage(
        `   BLOCKED — ${result2.reason} (Score: ${result2.trustScore}, Tier: ${result2.tier})`,
      ),
    )
  }

  log(
    "\n   4c. Verification with untrusted issuer (should FAIL)...",
  )
  const result3 = await verifyAsterPayKyaAsAckId(
    jwks,
    kyaToken,
    ["did:web:some-other-provider.xyz"],
    0,
  )
  if (result3.valid) {
    log(successMessage(`   PASSED`))
  } else {
    log(errorMessage(`   BLOCKED — ${result3.reason}`))
  }

  // Step 5: ERC-8183 IACPHook simulation
  log(
    `\nFinally, we simulate how an ERC-8183 Agentic Commerce Protocol job uses
ACK-ID with AsterPay KYA to gate agent access. The IACPHook checks the
agent's trust score before allowing job funding or provider assignment.\n`,
  )
  await waitForEnter()

  log("5. Simulating ERC-8183 IACPHook with ACK-ID...\n")

  await simulateIACPHook(jwks, kyaToken)

  log(`
🎉 Demo complete

📋 Summary:
   • AsterPay KYA tokens convert to W3C Verifiable Credentials for ACK-ID
   • Trust Score (0-100) with 7 components + InsumerAPI attestations
   • Bidirectional JWT ↔ VC conversion with full cryptographic integrity
   • ACK-ID verification with configurable trust score thresholds
   • Sanctions screening (Chainalysis) integrated into verification
   • ERC-8183 IACPHook can use ACK-ID to gate agent commerce
   • AsterPay serves as a Trust Provider in the ACK ecosystem

🔗 Links:
   • AsterPay: https://asterpay.io
   • KYA API: https://api.asterpay.io/v1/agent/trust-score/:address
   • ERC-8183 KYA Hook: https://github.com/AsterPay/erc8183-kya-hook
   • InsumerAPI: https://insumermodel.com
   • ACK: https://agentcommercekit.com
`)
}

const TIER_BUDGET_LIMITS: Record<string, number> = {
  open: 1,
  verified: 1_000,
  trusted: 10_000,
  enterprise: Infinity,
}

async function simulateIACPHook(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
) {
  const jobBudget = 50
  log(`   📋 ERC-8183 Job: 'Analyze Q4 market data' (budget: ${jobBudget} USDC)`)
  log("   🤖 Agent requests to fund the job...")
  log("   🔒 IACPHook.beforeAction(fund) triggered\n")

  log("   → Resolving agent identity via ACK-ID...")

  const minScore = 50
  const verification = await verifyAsterPayKyaAsAckId(
    jwks,
    kyaToken,
    ["did:web:api.asterpay.io"],
    minScore,
  )

  if (!verification.valid || !verification.vc) {
    log(
      `\n   ${errorMessage(`IACPHook: BLOCKED — ${verification.reason}`)}`,
    )
    log(`   → Emitting ReputationNegative event`)
    return
  }

  const vc = verification.vc

  log(
    `   → Agent: ${colors.magenta(vc.credentialSubject.agentAddress)}`,
  )
  log(
    `   → ERC-8004 ID: ${colors.magenta(vc.credentialSubject.agentId ?? "none")}`,
  )
  log(
    `   → Trust Score: ${colors.magenta(String(vc.credentialSubject.trustScore))} / 100`,
  )
  log(
    `   → Tier: ${colors.magenta(vc.credentialSubject.tier)}`,
  )

  log("\n   → Running 5-shield verification:")

  const hasIdentity = !!vc.credentialSubject.agentId
  log(
    `     ${hasIdentity ? "✅" : "❌"} VERIFY: ERC-8004 identity ${hasIdentity ? `confirmed (${vc.credentialSubject.agentId})` : "missing"}`,
  )

  const notSanctioned = !vc.credentialSubject.sanctioned
  log(
    `     ${notSanctioned ? "✅" : "❌"} SCREEN: Chainalysis sanctions ${notSanctioned ? "clear" : "FLAGGED"} (sanctioned=${vc.credentialSubject.sanctioned})`,
  )

  const scorePass = vc.credentialSubject.trustScore >= minScore
  log(
    `     ${scorePass ? "✅" : "❌"} SCORE: Trust score ${vc.credentialSubject.trustScore} ${scorePass ? "≥" : "<"} ${minScore} minimum`,
  )

  const att = vc.credentialSubject.insumerAttestation
  const attestPass =
    att.coinbaseKyc.met &&
    att.coinbaseCountry.met &&
    att.gitcoinPassport.met &&
    att.tokenBalance.met
  log(
    `     ${attestPass ? "✅" : "❌"} ATTEST: InsumerAPI — KYC=${att.coinbaseKyc.met}, Country=${att.coinbaseCountry.country}, Passport=${att.gitcoinPassport.met}, USDC=${att.tokenBalance.met}`,
  )

  const tierLimit = TIER_BUDGET_LIMITS[vc.credentialSubject.tier] ?? 0
  const tierAuthorized = hasIdentity && notSanctioned && scorePass && attestPass && jobBudget <= tierLimit
  log(
    `     ${tierAuthorized ? "✅" : "❌"} COMPLY: Tier "${vc.credentialSubject.tier}" (limit: ${tierLimit === Infinity ? "unlimited" : `$${tierLimit}`}) ${tierAuthorized ? "authorized" : "denied"} for $${jobBudget} job budget`,
  )

  if (tierAuthorized) {
    log(
      `\n   ${successMessage("IACPHook: APPROVED — Agent may fund the job")}`,
    )
    log(`   → Emitting ReputationPositive event for ${vc.credentialSubject.agentAddress}`)
  } else {
    log(
      `\n   ${errorMessage("IACPHook: REJECTED — Agent failed verification gates")}`,
    )
    log(`   → Emitting ReputationNegative event for ${vc.credentialSubject.agentAddress}`)
  }
}

runDemo().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
