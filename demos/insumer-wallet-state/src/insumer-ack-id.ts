// insumer-ack-id — map an InsumerAPI wallet-state attestation into ACK's
// Verifiable Credential envelope, so an ACK service can gate access on it.
//
// Mirrors demos/skyfire-kya: an external ES256/JWKS-signed attestation is
// verified out-of-band and surfaced as a boolean, then mapped into ACK's W3C
// Verifiable Credential so an ACK service can gate access on live wallet state.
//
// Verification is delegated to the canonical `insumer-verify` SDK (npm) — it
// checks the ECDSA P-256 signature, the condition-hash binding, and expiry
// (plus block freshness when a maxAge is supplied) against the public JWKS.
// This file adds ONLY the ACK-specific glue: a trusted-issuer gate and a W3C
// Verifiable Credential mapping.
//
//   • Verifying needs ONLY the public JWKS — no API key, no shared secret.
//   • Minting a fresh attestation needs your own key (POST /v1/attest).

import type { Verifiable, W3CCredential } from "agentcommercekit"
import { verifyAttestation } from "insumer-verify"

export const INSUMER_ISSUER = "https://api.insumermodel.com"

// DID label used for ACK's trusted-issuer allowlist. Verification does NOT
// depend on DID resolution — insumer-verify checks the signature against the
// published JWKS directly, exactly as ACK's skyfire-kya demo does.
export const INSUMER_ISSUER_DID = "did:web:api.insumermodel.com"

const DEFAULT_JWKS_URL = "https://insumermodel.com/.well-known/jwks.json"

export interface InsumerVerifyOptions {
  /** Public JWKS URL — the trust anchor. MUST be a constant you control,
   *  never a value derived from caller/agent input. */
  jwksUrl?: string
  /** Optional: also enforce block freshness (max blockTimestamp age, seconds). */
  maxAge?: number
}

export interface WalletStateCredentialSubject {
  id: string
  pass: boolean
  conditionHash: string[]
  results: unknown[]
}

export interface WalletStateGateResult {
  granted: boolean
  reason?: string
  pass?: boolean
  subject?: string
  wallet?: string
  conditionHash?: string[]
  results?: unknown[]
  expiresAt?: string
}

interface InsumerAttestationPayload {
  pass: boolean
  conditionHash: string[]
  results: Array<{ chainId?: number | string }>
  iss: string
  sub: string
  jti: string
  iat: number
  exp: number
}

function decodeJwtPayload(token: string): InsumerAttestationPayload {
  const part = token.split(".")[1]
  if (!part) throw new Error("Malformed JWT: missing payload segment")
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"))
}

function firstFailedCheck(checks: Record<string, { passed: boolean; reason?: string }>): string {
  for (const [name, c] of Object.entries(checks)) {
    if (!c.passed) return `${name}: ${c.reason ?? "failed"}`
  }
  return "unknown"
}

// did:pkh subject label for the verified wallet (EVM). Non-EVM subjects fall
// back to a urn carrying the raw address.
function subjectDid(payload: InsumerAttestationPayload): string {
  const chainId = payload.results?.[0]?.chainId
  if (typeof chainId === "number") {
    return `did:pkh:eip155:${chainId}:${payload.sub}`
  }
  return `urn:insumer:wallet:${payload.sub}`
}

/**
 * Verify a raw InsumerAPI attestation (JWT string) with the canonical
 * insumer-verify SDK. Returns its structured VerifyResult.
 */
export async function verifyInsumerAttestation(token: string, opts: InsumerVerifyOptions = {}) {
  return verifyAttestation(token, {
    jwksUrl: opts.jwksUrl ?? DEFAULT_JWKS_URL,
    maxAge: opts.maxAge,
  })
}

/**
 * ACK-ID-style gate: fully verify the attestation, then confirm Insumer is a
 * trusted issuer. `granted` is the boolean an ACK service would gate on.
 * Mirrors demos/skyfire-kya's verifySkyfireKyaAsAckId.
 */
export async function verifyInsumerAttestationAsAckId(
  token: string,
  trustedIssuers: string[],
  opts: InsumerVerifyOptions = {},
): Promise<WalletStateGateResult> {
  const result = await verifyInsumerAttestation(token, opts)
  if (!result.valid) {
    return { granted: false, reason: firstFailedCheck(result.checks) }
  }

  const payload = decodeJwtPayload(token)
  if (payload.iss !== INSUMER_ISSUER) {
    return { granted: false, reason: "issuer-mismatch" }
  }
  if (!trustedIssuers.includes(INSUMER_ISSUER_DID)) {
    return { granted: false, reason: "issuer-not-trusted" }
  }

  return {
    granted: payload.pass === true,
    pass: payload.pass,
    subject: subjectDid(payload),
    wallet: payload.sub,
    conditionHash: payload.conditionHash,
    results: payload.results,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

/**
 * Convert a verified InsumerAPI attestation into an ACK-compatible W3C
 * Verifiable Credential, preserving the original ES256 signature as a detached
 * JWS proof. conditionHash is carried through verbatim as an opaque
 * fingerprint — never recomputed here (insumer-verify owns that check).
 */
export async function convertInsumerAttestationToVerifiableCredential(
  token: string,
  opts: InsumerVerifyOptions = {},
): Promise<Verifiable<W3CCredential<WalletStateCredentialSubject>>> {
  const result = await verifyInsumerAttestation(token, opts)
  if (!result.valid) {
    throw new Error(`Attestation failed verification — ${firstFailedCheck(result.checks)}`)
  }

  const payload = decodeJwtPayload(token)
  const [encodedHeader, , signature] = token.split(".")
  if (!encodedHeader || !signature) throw new Error("Malformed JWT")
  const kid = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")).kid as string

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://agentcommercekit.com/contexts/insumer/v1",
    ],
    id: `urn:insumer:attestation:${payload.jti}`,
    type: ["VerifiableCredential", "WalletStateCredential"],
    issuer: { id: INSUMER_ISSUER_DID },
    issuanceDate: new Date(payload.iat * 1000).toISOString(),
    expirationDate: new Date(payload.exp * 1000).toISOString(),
    credentialSubject: {
      id: subjectDid(payload),
      pass: payload.pass,
      conditionHash: payload.conditionHash, // opaque fingerprint, passthrough
      results: payload.results,
    },
    proof: {
      type: "JsonWebSignature2020",
      created: new Date(payload.iat * 1000).toISOString(),
      verificationMethod: `${INSUMER_ISSUER_DID}#${kid}`,
      proofPurpose: "assertionMethod",
      jws: `${encodedHeader}..${signature}`, // detached JWS
    },
  } as Verifiable<W3CCredential<WalletStateCredentialSubject>>
}

// ---------------------------------------------------------------------------
// NATIVE UPSTREAM PATH (not used by the runnable demo).
//
// ACK's generic verifyParsedCredential() runs verifyProof() FIRST, which
// resolves the credential issuer through a DID resolver (did:key/web/jwks/pkh)
// and only accepts a JwtProof2020 proof. To flow an Insumer attestation through
// that path natively — instead of this out-of-band adapter — InsumerAPI would:
//   1. publish a did:web:api.insumermodel.com DID document, and
//   2. emit VC-shaped output carrying a JwtProof2020 proof.
// Then this ClaimVerifier slots into verifyParsedCredential({ verifiers }),
// next to ACK's getControllerClaimVerifier() / getReceiptClaimVerifier().
export function getWalletStateClaimVerifier() {
  return {
    accepts: (type: string[]) => type.includes("WalletStateCredential"),
    verify: async (credentialSubject: { pass?: boolean }) => {
      if (credentialSubject?.pass !== true) {
        throw new Error("WalletStateCredential: on-chain condition not met")
      }
    },
  }
}
