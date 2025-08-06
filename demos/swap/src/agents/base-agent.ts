import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  createJwt,
  createJwtSigner,
  generateKeypair,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtSigner,
  type JwtString,
  type Keypair,
  type Verifiable,
  type W3CCredential
} from "agentcommercekit"
import { colors, log } from "@repo/cli-tools"
import { CredentialVerifier } from "../services/credential-verifier"
import type { AgentMetadata, AgentPolicies, PolicyResult } from "../types"

interface AgentConstructorParams {
  resolver: DidResolver
  baseUrl: string
  ownerDid: DidUri
  verifier: CredentialVerifier
  keypair: Keypair
  policies?: AgentPolicies
  ackLabUrl?: string
}

/**
 * Base Agent class
 * Extended by SwapRequestor and SwapExecutor
 */
export abstract class BaseAgent {
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly ownerDid: DidUri
  readonly keypair: Keypair
  readonly signer: JwtSigner
  readonly resolver: DidResolver
  readonly verifier: CredentialVerifier
  readonly policies: AgentPolicies
  protected ackLabUrl: string

  ownershipVc?: Verifiable<W3CCredential>

  constructor({
    resolver,
    baseUrl,
    ownerDid,
    verifier,
    keypair,
    policies = {
      requireCatenaICC: false,
      maxTransactionSize: 1000000000, // 1000 USDC
      dailyTransactionLimit: 10000000000 // 10000 USDC
    },
    ackLabUrl = "http://localhost:5680"
  }: AgentConstructorParams) {
    if (!keypair) {
      throw new Error("Keypair is required for agent creation")
    }
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair,
      controller: ownerDid,
      service: [
        {
          id: `${did}/swap`,
          type: "SwapEndpoint",
          serviceEndpoint: `${baseUrl}/swap`
        },
        {
          id: `${did}/identity`,
          type: "IdentityService",
          serviceEndpoint: `${baseUrl}/identity`
        }
      ]
    })

    this.did = did
    this.ownerDid = ownerDid
    this.didDocument = didDocument
    this.verifier = verifier
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)
    this.resolver = resolver
    this.policies = policies
    this.ackLabUrl = ackLabUrl

    // Add DID document to resolver cache so it can be resolved locally
    resolver.addToCache(did, didDocument)
  }

  /**
   * Set the ownership VC for this agent
   */
  setOwnershipVc(vc: Verifiable<W3CCredential>) {
    this.ownershipVc = vc
  }

  /**
   * Create a JWT for authentication to ACK-Lab
   */
  async createAuthJwt(): Promise<JwtString> {
    return createJwt(
      {
        sub: this.did,
        iat: Math.floor(Date.now() / 1000)
      },
      {
        issuer: this.did,
        signer: this.signer,
        expiresIn: 300 // 5 minutes
      }
    )
  }

  /**
   * Fetch counterparty metadata from ACK-Lab
   */
  async fetchCounterpartyMetadata(did: DidUri): Promise<AgentMetadata | null> {
    const response = await fetch(`${this.ackLabUrl}/metadata?did=${did}`)
    if (!response.ok) return null
    return response.json()
  }

  /**
   * Check current balance
   */
  async checkBalance(): Promise<Record<string, string> | null> {
    const jwt = await this.createAuthJwt()
    const response = await fetch(`${this.ackLabUrl}/balance`, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    })
    if (!response.ok) return null
    return response.json()
  }

  /**
   * Fetch current policies from ACK-Lab
   */
  async fetchCurrentPolicies(): Promise<AgentPolicies | null> {
    try {
      const metadata = await this.fetchCounterpartyMetadata(this.did)
      return metadata?.policies || null
    } catch (error) {
      log(colors.yellow(`[Agent] Failed to fetch current policies: ${error}`))
      return null
    }
  }

  /**
   * Check if counterparty meets policy requirements
   */
  async checkPolicies(
    counterpartyMetadata: AgentMetadata,
    swapAmount: number
  ): Promise<PolicyResult> {
    // Fetch current policies from ACK-Lab
    const currentPolicies = await this.fetchCurrentPolicies()
    const policiesToUse = currentPolicies || this.policies

    log(
      colors.cyan(
        `[Policy Check] Using policies: ${JSON.stringify(policiesToUse)}`
      )
    )
    log(
      colors.cyan(
        `[Policy Check] Checking swap amount: ${swapAmount} USDC (${swapAmount * 1000000} subunits)`
      )
    )

    // Check Catena ICC requirement
    if (policiesToUse.requireCatenaICC) {
      log(
        colors.yellow(
          `[Policy Check] Catena ICC required - checking counterparty credentials`
        )
      )
      // For demo, we'll check if issuer is Catena (mocked)
      const issuerDid = "did:web:catena.example.com"
      // In real implementation, extract issuer from VC
      // const issuer = extractIssuerFromVC(counterpartyMetadata.vc)
      // if (issuer !== CATENA_DID) {
      //   return { allowed: false, reason: "Requires Catena ICC" }
      // }

      // For now, always fail Catena ICC check in demo
      return { allowed: false, reason: "Requires Catena ICC credential" }
    }

    // Check transaction size (convert USDC to subunits for comparison)
    const swapAmountSubunits = swapAmount * 1000000
    if (swapAmountSubunits > policiesToUse.maxTransactionSize) {
      const maxUsdc = policiesToUse.maxTransactionSize / 1000000
      log(
        colors.red(
          `[Policy Check] Transaction size ${swapAmount} USDC exceeds limit of ${maxUsdc} USDC`
        )
      )
      return {
        allowed: false,
        reason: `Exceeds transaction limit of ${maxUsdc} USDC`
      }
    }

    // Check trusted agents
    if (policiesToUse.trustedAgents?.length) {
      if (!policiesToUse.trustedAgents.includes(counterpartyMetadata.did)) {
        log(
          colors.red(
            `[Policy Check] Agent ${counterpartyMetadata.did} not in trusted list`
          )
        )
        return { allowed: false, reason: "Agent not in trusted list" }
      }
    }

    log(colors.green(`[Policy Check] All policy checks passed`))
    return { allowed: true }
  }
}
