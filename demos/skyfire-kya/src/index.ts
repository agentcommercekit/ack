import type { JwtString, Verifiable, W3CCredential } from "agentcommercekit"
import type * as jose from "jose"

import {
  colors,
  errorMessage,
  log,
  logJson,
  successMessage,
  waitForEnter,
} from "@repo/cli-tools"

import { generateJwks } from "./jwk-keys"
import { createMockSkyfireKyaToken } from "./kya-token"
import {
  convertSkyfireKyaToVerifiableCredential,
  convertVerifiableCredentialToSkyfireKya,
  getBuyerDidFromVC,
  getOwnerDidFromVC,
  getSellerDidFromVC,
  verifySkyfireKyaAsAckId,
  type SkyfireKyaCredentialSubject,
} from "./skyfire-kya-ack-id"

async function runDemo() {
  const { jwks, keypair } = await generateJwks()
  log("🚀 Skyfire ACK-ID Integration Demo\n")

  // Overview
  log(`📝 Overview:
   This demo shows how Skyfire KYA (Know Your Agent) tokens can work on top of ACK-ID's core identity infrastructure. Skyfire KYA JWTs already present cryptographic attestations of agent identity and are essentially Verifiable Credentials that can be converted to W3C standard VCs for ACK-ID compatibility.

   We'll demonstrate:
   • Converting a Skyfire KYA JWT to an ACK-ID compatible Verifiable Credential
   • Bidirectional conversion maintaining full cryptographic integrity (JWT ↔ VC)
   • ACK-ID verification flows that can work with Skyfire KYA tokens
   • Service interactions using ACK-ID infrastructure with Skyfire identities
`)
  await waitForEnter("Press Enter to start the demo...")

  // create mock kya token
  log(
    `In this first step, we'll work with a Skyfire KYA token that contains buyer identity data, service scope, and a cryptographic proof.`,
  )
  await waitForEnter()

  log("1. Creating mock Skyfire KYA token...")

  const kyaToken = await createMockSkyfireKyaToken(keypair)
  log(successMessage("KYA token created"))
  log(colors.dim(kyaToken), { wrap: false })

  // verify and extract ack-id identity
  log(
    `\nNext, we'll convert the Skyfire KYA JWT into an ACK-ID compatible Verifiable Credential. This creates a W3C standard Verifiable Credential that preserves the original JWT's signature and payload.`,
  )
  await waitForEnter()

  log("2. Converting KYA JWT to ACK-ID compatible Verifiable Credential...")

  let vc: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>
  try {
    vc = await convertSkyfireKyaToVerifiableCredential(jwks, kyaToken)
    log(successMessage("Verifiable Credential created:"))
    logJson(vc)
    log(`
Details:
   Buyer DID: ${colors.magenta(getBuyerDidFromVC(vc))}
   Seller DID: ${colors.magenta(getSellerDidFromVC(vc))}
   Owner DID: ${colors.magenta(getOwnerDidFromVC(vc) ?? "N/A")}
   Buyer data:`)
    logJson(vc.credentialSubject.bid)
    log("")
  } catch (error: unknown) {
    log(errorMessage("Identity extraction failed"))
    log(colors.dim((error as Error).toString()))
    return
  }

  // demonstrate bidirectional conversion
  log(
    `\nNow we'll demonstrate that the conversion maintains full cryptographic integrity by converting the VC back to the original JWT format with perfect fidelity.`,
  )
  await waitForEnter()

  log("3. Demonstrating bidirectional conversion...")

  try {
    const reconstructedJwt = convertVerifiableCredentialToSkyfireKya(vc)
    log(`${successMessage("Successfully converted VC back to JWT:")}

   Original JWT matches reconstructed: ${colors.magenta(kyaToken === reconstructedJwt ? "true" : "false")}
   Reconstructed JWT:`)
    log(colors.dim(reconstructedJwt), { wrap: false })
  } catch (error: unknown) {
    log(errorMessage("Bidirectional conversion failed"))
    log(colors.dim((error as Error).toString()))
    return
  }

  // verify using ack-id style verification
  log(
    `\nNext, we'll verify the Skyfire KYA token using ACK-ID's verification infrastructure, demonstrating how Skyfire can work on top of ACK-ID.`,
  )
  await waitForEnter()

  log("4. Running ACK-ID style verification...")

  const isValid = await verifySkyfireKyaAsAckId(jwks, kyaToken, [
    "did:web:api.skyfire.xyz",
  ])

  if (isValid) {
    log(successMessage("Verification passed - agent is authorized"))
  } else {
    log(errorMessage("Verification failed - agent not authorized"))
    return
  }

  // simulate service interaction
  log(
    `\nFinally, we'll simulate how services built on ACK-ID can seamlessly work with Skyfire KYA tokens without any modifications.`,
  )
  await waitForEnter()

  log("5. Simulating service interaction...")

  await simulateServiceCall(jwks, kyaToken)

  log(`\n🎉 Demo complete\n\n📋 Summary:
   • Skyfire KYA tokens can work on top of ACK-ID's infrastructure
   • KYA JWTs are essentially VCs that convert to W3C format with full cryptographic integrity
   • Conversion is bidirectional: JWT ↔ VC with perfect fidelity
   • Services built on ACK-ID can automatically support Skyfire KYA tokens
   • This demonstrates how ACK-ID can serve as the foundational identity layer
`)
}

async function simulateServiceCall(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
) {
  log("   📞 Incoming request with KYA token...")

  // extract identity for business logic
  const vc = await convertSkyfireKyaToVerifiableCredential(jwks, kyaToken)

  const buyerData = vc.credentialSubject.bid
  log(`   🏢 Serving agent: ${colors.magenta(buyerData.agentName)}
    Buyer name: ${colors.magenta(buyerData.nameFirst + " " + buyerData.nameLast)}
      - Owned by: ${colors.dim(buyerData.ownerId)}
      - Authorized by: ${colors.dim(vc.issuer.id)}
      - Service scope: ${colors.dim(vc.credentialSubject.ssi)}
    Token expires: ${colors.dim(vc.expirationDate ?? "N/A")}
    Credential ID: ${colors.dim(vc.id ?? "N/A")}
    Credential Type: ${colors.dim(Array.isArray(vc.type) ? vc.type.join(", ") : String(vc.type))}
    JWT Algorithm: ${colors.dim(vc.proof.type ?? "N/A")}
    Signature: ${colors.dim(typeof vc.proof.jws === "string" ? vc.proof.jws.slice(0, 20) : "N/A")}
`)

  log(successMessage("   Request processed successfully"))
}

// run the demo
runDemo().catch(console.error)
