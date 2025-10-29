import {
  bytesToBase64url,
  type DidUri,
  type DidWebUri,
  type JwtPayload,
  type JwtString,
  type Verifiable,
  type W3CCredential
} from "agentcommercekit"
import * as jose from "jose"
import type { SkyfireKyaJwtPayload } from "./kya-token"

export interface SkyfireKyaCredentialSubject {
  id: DidUri // VC spec requires id in credentialSubject (represents the subject)
  // Core KYA data (excluding several fields that are in VC structure)
  aud: string // audience (seller service)
  bid: SkyfireKyaJwtPayload["bid"] // buyer identity data
  ssi: string // seller service identifier
  jti: string // JWT ID
}

export async function convertSkyfireKyaToVerifiableCredential(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString
): Promise<Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>> {
  const verifier = jose.createLocalJWKSet(jwks)
  const { payload } = await jose.jwtVerify<SkyfireKyaJwtPayload>(
    kyaToken,
    verifier,
    {
      issuer: "https://api.skyfire.xyz/",
      typ: "kya+JWT"
    }
  )

  // Extract the signature from the JWT (third part after splitting by '.')
  const jwtParts = kyaToken.split(".")
  if (jwtParts.length !== 3) {
    throw new Error("Invalid JWT format")
  }
  const jwtSignature = jwtParts[2]

  if (
    !payload.iat ||
    !payload.exp ||
    !payload.jti ||
    !payload.sub ||
    !payload.ssi
  ) {
    throw new Error("Invalid JWT payload")
  }

  // synthetic did for the buyer agent
  const buyerDid: DidWebUri = `did:web:api.skyfire.xyz:buyer:${payload.sub}`

  // synthetic did for the seller service
  const _sellerDid: DidWebUri = `did:web:api.skyfire.xyz:seller:${payload.ssi}`

  // Create a VC that preserves the original JWT payload and signature
  // This maintains cryptographic integrity while providing VC compatibility
  const syntheticVC: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>> = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://agentcommercekit.com/contexts/skyfire/v1"
    ],
    id: `urn:uuid:${payload.jti}`,
    type: ["VerifiableCredential", "SkyFireKYACredential"],
    issuer: { id: "did:web:api.skyfire.xyz" },
    issuanceDate: new Date(payload.iat * 1000).toISOString(),
    expirationDate: new Date(payload.exp * 1000).toISOString(),
    // Include core KYA data in credentialSubject (excluding VC-level fields)
    credentialSubject: {
      id: buyerDid, // this represents the subject (sub field)
      aud: payload.aud as string,
      bid: payload.bid,
      ssi: payload.ssi,
      jti: payload.jti
    },
    // Use the actual JWT signature with proper proof format
    proof: {
      type: "JsonWebSignature2020",
      created: new Date(payload.iat * 1000).toISOString(),
      verificationMethod: "did:web:api.skyfire.xyz#key-1",
      proofPurpose: "assertionMethod",
      // Use the actual JWT signature (base64url encoded)
      jws: `${jwtParts[0]}..${jwtSignature}` // detached JWS format
    }
  }

  return syntheticVC
}

/**
 * Extract the buyer DID from a Skyfire KYA converted Verifiable Credential
 */
export function getBuyerDidFromVC(
  vc: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>
): DidWebUri {
  return vc.credentialSubject.id as DidWebUri
}

/**
 * Extract the seller DID from a Skyfire KYA converted Verifiable Credential
 */
export function getSellerDidFromVC(
  vc: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>
): DidWebUri {
  return `did:web:api.skyfire.xyz:seller:${vc.credentialSubject.ssi}` as DidWebUri
}

/**
 * Extract the owner DID from a Skyfire KYA converted Verifiable Credential (if present)
 */
export function getOwnerDidFromVC(
  vc: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>
): DidWebUri | undefined {
  return vc.credentialSubject.bid.ownerId
    ? (`did:web:api.skyfire.xyz:owner:${vc.credentialSubject.bid.ownerId}` as DidWebUri)
    : undefined
}

export interface SkyFireKYAPayload extends JwtPayload {
  bid: Record<string, unknown> // buyer identity data
  ssi: string // seller service id
  jti: string
}

// create ack-id compatible verification for services
export async function verifySkyfireKyaAsAckId(
  jwks: jose.JSONWebKeySet,
  kyaToken: JwtString,
  trustedIssuers: string[]
): Promise<boolean> {
  try {
    const vc = await convertSkyfireKyaToVerifiableCredential(jwks, kyaToken)

    // check if skyfire is in trusted issuers
    if (!trustedIssuers.includes("did:web:api.skyfire.xyz")) {
      return false
    }

    // verify expiration
    if (vc.expirationDate && new Date() > new Date(vc.expirationDate)) {
      return false
    }

    // verify the buyer->owner relationship if present
    const ownerDid = getOwnerDidFromVC(vc)
    if (ownerDid && getOwnerDidFromVC(vc) !== ownerDid) {
      return false
    }

    return true
  } catch (error) {
    console.error("Skyfire KYA verification failed:", error)
    return false
  }
}

/**
 * Convert a Verifiable Credential back to the original Skyfire KYA JWT token
 * This demonstrates the bidirectional nature of the conversion
 */
export function convertVerifiableCredentialToSkyfireKya(
  vc: Verifiable<W3CCredential<SkyfireKyaCredentialSubject>>
): JwtString {
  // Reconstruct the original JWT payload from VC data
  const { id, ...credentialData } = vc.credentialSubject

  // Extract sub from the buyer DID (format: did:web:api.skyfire.xyz:buyer:{sub})
  const buyerDidParts = (id as string).split(":")
  const sub = buyerDidParts[buyerDidParts.length - 1]

  // Add back the VC-level fields that were moved to VC structure
  const jwtPayload = {
    ...credentialData,
    sub,
    iss: "https://api.skyfire.xyz/",
    iat: Math.floor(new Date(vc.issuanceDate).getTime() / 1000),
    exp: Math.floor(new Date(vc.expirationDate ?? "").getTime() / 1000)
  }

  // Reconstruct the JWT header (Skyfire always uses ES256 with kya+JWT type)
  const header = {
    alg: "ES256",
    typ: "kya+JWT"
  }

  // Base64url encode header and payload
  const encodedHeader = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  )
  const encodedPayload = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify(jwtPayload))
  )

  // Extract signature from the VC proof (format: "header..signature")
  if (!vc.proof.jws) {
    throw new Error("No JWS signature found in VC proof")
  }

  const jwsParts = (vc.proof.jws as string).split("..")
  if (jwsParts.length !== 2) {
    throw new Error("Invalid JWS format in VC proof")
  }

  const signature = jwsParts[1]

  // Reconstruct the complete JWT
  const reconstructedJwt =
    `${encodedHeader}.${encodedPayload}.${signature}` as JwtString

  return reconstructedJwt
}
