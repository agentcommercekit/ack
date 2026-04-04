import {
  type DidUri,
  type DidWebUri,
  type JwtString,
  type Verifiable,
  type W3CCredential,
} from "agentcommercekit"
import * as jose from "jose"

import type { AsterPayKyaJwtPayload } from "./kya-token"

export interface AsterPayKyaCredentialSubject {
  id: DidUri
  agentAddress: string
  agentId?: string
  trustScore: number
  tier: string
  components: AsterPayKyaJwtPayload["components"]
  insumerAttestation: AsterPayKyaJwtPayload["insumerAttestation"]
  sanctioned: boolean
  jti: string
}

export async function convertAsterPayKyaToVerifiableCredential(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
): Promise<Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>> {
  const verifier = jose.createLocalJWKSet(jwks)
  const { payload } = await jose.jwtVerify<AsterPayKyaJwtPayload>(
    kyaToken,
    verifier,
    {
      issuer: "https://api.asterpay.io/",
      typ: "kya+JWT",
    },
  )

  const jwtParts = kyaToken.split(".")
  if (jwtParts.length !== 3) {
    throw new Error("Invalid JWT format")
  }

  if (!payload.iat || !payload.exp || !payload.jti || !payload.sub) {
    throw new Error("Invalid JWT payload: missing required standard claims")
  }

  if (
    typeof payload.trustScore !== "number" ||
    typeof payload.sanctioned !== "boolean" ||
    !payload.agentAddress ||
    !payload.tier ||
    !payload.components ||
    !payload.insumerAttestation
  ) {
    throw new Error(
      "Invalid JWT payload: missing trust-critical claims (trustScore, sanctioned, agentAddress, tier, components, insumerAttestation)",
    )
  }

  const agentDid: DidWebUri =
    `did:web:api.asterpay.io:agent:${payload.sub}` as DidWebUri

  const syntheticVC: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>> = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://agentcommercekit.com/contexts/asterpay-kya/v1",
    ],
    id: `urn:uuid:${payload.jti}`,
    type: [
      "VerifiableCredential",
      "AsterPayKYACredential",
      "AgentTrustScoreCredential",
    ],
    issuer: { id: "did:web:api.asterpay.io" },
    issuanceDate: new Date(payload.iat * 1000).toISOString(),
    expirationDate: new Date(payload.exp * 1000).toISOString(),
    credentialSubject: {
      id: agentDid,
      agentAddress: payload.agentAddress,
      agentId: payload.agentId,
      trustScore: payload.trustScore,
      tier: payload.tier,
      components: payload.components,
      insumerAttestation: payload.insumerAttestation,
      sanctioned: payload.sanctioned,
      jti: payload.jti,
    },
    proof: {
      type: "JwtProof2020",
      created: new Date(payload.iat * 1000).toISOString(),
      verificationMethod: "did:web:api.asterpay.io#kya-key-1",
      proofPurpose: "assertionMethod",
      jwt: kyaToken,
    },
  }

  return syntheticVC
}

export function getAgentDidFromVC(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): DidWebUri {
  return vc.credentialSubject.id as DidWebUri
}

export function getTrustScoreFromVC(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): number {
  return vc.credentialSubject.trustScore
}

export function getTierFromVC(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): string {
  return vc.credentialSubject.tier
}

export function getInsumerAttestationFromVC(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): AsterPayKyaCredentialSubject["insumerAttestation"] {
  return vc.credentialSubject.insumerAttestation
}

export function isSanctionedFromVC(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): boolean {
  return vc.credentialSubject.sanctioned
}

export type AsterPayVerificationResult = {
  valid: boolean
  reason?: string
  trustScore?: number
  tier?: string
  vc?: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>
}

export async function verifyAsterPayKyaAsAckId(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
  trustedIssuers: string[],
  minTrustScore = 0,
): Promise<AsterPayVerificationResult> {
  try {
    const vc = await convertAsterPayKyaToVerifiableCredential(jwks, kyaToken)

    const issuerDid = typeof vc.issuer === "string" ? vc.issuer : vc.issuer.id
    if (!trustedIssuers.includes(issuerDid)) {
      return { valid: false, reason: `Issuer ${issuerDid} not in trusted issuers` }
    }

    if (vc.expirationDate && new Date() > new Date(vc.expirationDate)) {
      return { valid: false, reason: "KYA token expired" }
    }

    if (vc.credentialSubject.sanctioned) {
      return {
        valid: false,
        reason: "Agent is sanctioned (Chainalysis)",
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
        vc,
      }
    }

    if (vc.credentialSubject.trustScore < minTrustScore) {
      return {
        valid: false,
        reason: `Trust score ${vc.credentialSubject.trustScore} below minimum ${minTrustScore}`,
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
        vc,
      }
    }

    const att = vc.credentialSubject.insumerAttestation
    if (!att.coinbaseKyc.met) {
      return {
        valid: false,
        reason: "Coinbase KYC attestation not met",
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
        vc,
      }
    }

    if (!att.coinbaseCountry.met) {
      return {
        valid: false,
        reason: `Country verification not met (${att.coinbaseCountry.country})`,
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
        vc,
      }
    }

    return {
      valid: true,
      trustScore: vc.credentialSubject.trustScore,
      tier: vc.credentialSubject.tier,
      vc,
    }
  } catch (error) {
    return {
      valid: false,
      reason: `Verification error: ${(error as Error).message}`,
    }
  }
}

/**
 * Reconstructs the original KYA JWT from a synthetic VC.
 * Only works with VCs created by `convertAsterPayKyaToVerifiableCredential`
 * as it relies on the `jwt` field in the JwtProof2020 proof.
 */
export function convertVerifiableCredentialToAsterPayKya(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): JwtString {
  const jwt = (vc.proof as Record<string, unknown>).jwt as string | undefined

  if (!jwt) {
    throw new Error(
      "No jwt field found in VC proof — expected JwtProof2020 format",
    )
  }

  const parts = jwt.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format in VC proof")
  }

  return jwt as JwtString
}
