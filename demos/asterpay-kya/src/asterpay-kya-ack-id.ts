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
  const jwtSignature = jwtParts[2]

  if (!payload.iat || !payload.exp || !payload.jti || !payload.sub) {
    throw new Error("Invalid JWT payload")
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
      type: "JsonWebSignature2020",
      created: new Date(payload.iat * 1000).toISOString(),
      verificationMethod: "did:web:api.asterpay.io#kya-key-1",
      proofPurpose: "assertionMethod",
      jws: `${jwtParts[0]}..${jwtSignature}`,
      originalPayload: jwtParts[1],
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

export async function verifyAsterPayKyaAsAckId(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
  trustedIssuers: string[],
  minTrustScore = 0,
): Promise<{
  valid: boolean
  reason?: string
  trustScore?: number
  tier?: string
}> {
  try {
    const vc = await convertAsterPayKyaToVerifiableCredential(jwks, kyaToken)

    if (!trustedIssuers.includes("did:web:api.asterpay.io")) {
      return { valid: false, reason: "AsterPay not in trusted issuers" }
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
      }
    }

    if (vc.credentialSubject.trustScore < minTrustScore) {
      return {
        valid: false,
        reason: `Trust score ${vc.credentialSubject.trustScore} below minimum ${minTrustScore}`,
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
      }
    }

    const att = vc.credentialSubject.insumerAttestation
    if (!att.coinbaseKyc.met) {
      return {
        valid: false,
        reason: "Coinbase KYC attestation not met",
        trustScore: vc.credentialSubject.trustScore,
        tier: vc.credentialSubject.tier,
      }
    }

    return {
      valid: true,
      trustScore: vc.credentialSubject.trustScore,
      tier: vc.credentialSubject.tier,
    }
  } catch (error) {
    return {
      valid: false,
      reason: `Verification error: ${(error as Error).message}`,
    }
  }
}

export function convertVerifiableCredentialToAsterPayKya(
  vc: Verifiable<W3CCredential<AsterPayKyaCredentialSubject>>,
): JwtString {
  if (!vc.proof.jws) {
    throw new Error("No JWS signature found in VC proof")
  }

  const jwsParts = (vc.proof.jws as string).split("..")
  if (jwsParts.length !== 2) {
    throw new Error("Invalid JWS format in VC proof")
  }

  const originalHeader = jwsParts[0]
  const originalSignature = jwsParts[1]

  const originalPayload = (vc.proof as Record<string, unknown>)
    .originalPayload as string | undefined

  if (!originalPayload) {
    throw new Error(
      "No originalPayload found in VC proof — cannot reconstruct JWT losslessly",
    )
  }

  return `${originalHeader}.${originalPayload}.${originalSignature}` as JwtString
}
