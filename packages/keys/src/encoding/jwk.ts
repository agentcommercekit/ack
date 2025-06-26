import { base64urlToBytes, bytesToBase64url } from "./base64"
import type { KeypairAlgorithm } from "../types"

/**
 * JWK-encoding, specifically limited to public keys
 */
export type PublicKeyJwkSecp256k1 = {
  kty: "EC"
  crv: "secp256k1"
  x: string // base64url encoded x-coordinate
  y: string // base64url encoded y-coordinate
}

export type PublicKeyJwkSecp256r1 = {
  kty: "EC"
  crv: "secp256r1"
  x: string // base64url encoded x-coordinate
  y: string // base64url encoded y-coordinate
}

export type PublicKeyJwkEd25519 = {
  kty: "OKP"
  crv: "Ed25519"
  x: string // base64url encoded x-coordinate
}

export type PublicKeyJwk =
  | PublicKeyJwkSecp256k1
  | PublicKeyJwkSecp256r1
  | PublicKeyJwkEd25519

/**
 * JWK-encoding for private keys
 */
export type PrivateKeyJwk = PublicKeyJwk & {
  d: string // base64url encoded private key
}

function isPublicKeyJwkSecp256(
  jwk: unknown,
  crv: "secp256k1" | "secp256r1"
): jwk is PublicKeyJwkSecp256k1 | PublicKeyJwkSecp256r1 {
  if (typeof jwk !== "object" || jwk === null) {
    return false
  }

  const obj = jwk as Record<string, unknown>

  if (obj.kty !== "EC" || obj.crv !== crv) {
    return false
  }

  if (typeof obj.x !== "string" || obj.x.length === 0) {
    return false
  }

  if (typeof obj.y !== "string" || obj.y.length === 0) {
    return false
  }

  return true
}

export function isPublicKeyJwkSecp256k1(
  jwk: unknown
): jwk is PublicKeyJwkSecp256k1 {
  return isPublicKeyJwkSecp256(jwk, "secp256k1")
}

export function isPublicKeyJwkSecp256r1(
  jwk: unknown
): jwk is PublicKeyJwkSecp256k1 {
  return isPublicKeyJwkSecp256(jwk, "secp256r1")
}

export function isPublicKeyJwkEd25519(
  jwk: unknown
): jwk is PublicKeyJwkEd25519 {
  if (typeof jwk !== "object" || jwk === null) {
    return false
  }

  const obj = jwk as Record<string, unknown>

  if (obj.kty !== "OKP" || obj.crv !== "Ed25519") {
    return false
  }

  if (typeof obj.x !== "string" || obj.x.length === 0) {
    return false
  }

  if ("y" in obj) {
    return false
  }

  return true
}

/**
 * Check if an object is a valid public key JWK
 */
export function isPublicKeyJwk(jwk: unknown): jwk is PublicKeyJwk {
  return isPublicKeyJwkSecp256k1(jwk) || isPublicKeyJwkEd25519(jwk)
}

/**
 * Check if an object is a valid private key JWK
 */
export function isPrivateKeyJwk(jwk: unknown): jwk is PrivateKeyJwk {
  if (!isPublicKeyJwk(jwk)) {
    return false
  }

  const obj = jwk as Record<string, unknown>
  return typeof obj.d === "string" && obj.d.length > 0
}

/**
 * Convert public key bytes to a JWK format
 */
export function bytesToJwk(
  bytes: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyJwk {
  if (algorithm === "Ed25519") {
    return {
      kty: "OKP",
      crv: "Ed25519",
      x: bytesToBase64url(bytes)
    } as const
  }

  if (bytes.length !== 65) {
    throw new Error("Invalid secp256k1 public key length")
  }

  // Skip the first byte (0x04) and take 32 bytes for x, then 32 bytes for y
  const xBytes = bytes.slice(1, 33)
  const yBytes = bytes.slice(33)
  return {
    kty: "EC",
    crv: "secp256k1",
    x: bytesToBase64url(xBytes),
    y: bytesToBase64url(yBytes)
  } as const
}

/**
 * Convert a JWK to public key bytes
 */
export function jwkToBytes(jwk: PublicKeyJwk): Uint8Array {
  const xBytes = base64urlToBytes(jwk.x)

  // For secp256k1, we need to reconstruct the full public key
  if (jwk.crv === "secp256k1") {
    const fullKey = new Uint8Array(65)
    fullKey[0] = 0x04 // Add the prefix byte
    fullKey.set(xBytes, 1) // Add the x-coordinate
    fullKey.set(base64urlToBytes(jwk.y), 33) // Add the y-coordinate
    return fullKey
  }

  // For Ed25519, the x field is the complete public key
  return xBytes
}
