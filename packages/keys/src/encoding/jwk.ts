import { base64urlToBytes, bytesToBase64url } from "./base64"
import { getPublicKeyFromPrivateKey } from "../public-key"
import type { KeyCurve } from "../key-curves"

/**
 * JWK-encoding
 */
export type JwkSecp256k1 = {
  kty: "EC"
  crv: "secp256k1"
  x: string // base64url encoded x-coordinate
  y: string // base64url encoded y-coordinate
  d?: string // base64url encoded private key
}

export type PublicKeyJwkSecp256k1 = JwkSecp256k1 & {
  d?: never
}

export type PrivateKeyJwkSecp256k1 = JwkSecp256k1 & {
  d: string // base64url encoded private key
}

export type JwkSecp256r1 = {
  kty: "EC"
  crv: "secp256r1"
  x: string // base64url encoded x-coordinate
  y: string // base64url encoded y-coordinate
  d?: string // base64url encoded private key
}

export type PublicKeyJwkSecp256r1 = JwkSecp256r1 & {
  d?: never
}

export type PrivateKeyJwkSecp256r1 = JwkSecp256r1 & {
  d: string // base64url encoded private key
}

export type JwkEd25519 = {
  kty: "OKP"
  crv: "Ed25519"
  x: string // base64url encoded x-coordinate
  d?: string // base64url encoded private key
}

export type PublicKeyJwkEd25519 = JwkEd25519 & {
  d?: never
}

export type PrivateKeyJwkEd25519 = JwkEd25519 & {
  d: string // base64url encoded private key
}

export type Jwk = JwkSecp256k1 | JwkSecp256r1 | JwkEd25519

export type PublicKeyJwk =
  | PublicKeyJwkSecp256k1
  | PublicKeyJwkSecp256r1
  | PublicKeyJwkEd25519

export type PrivateKeyJwk =
  | PrivateKeyJwkSecp256k1
  | PrivateKeyJwkSecp256r1
  | PrivateKeyJwkEd25519

/**
 * Check if an object is a valid secp256k1 or secp256r1 public key (or private
 * key) JWK
 *
 * @param jwk - The JWK to check
 * @param crv - The curve to check
 * @returns True if the JWK is a valid secp256k1 or secp256r1 public key JWK
 */
function isJwkSecp256(
  jwk: unknown,
  crv: "secp256k1" | "secp256r1"
): jwk is JwkSecp256k1 | JwkSecp256r1 {
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

/**
 * Check if an object is a valid secp256k1 public key (or private key) JWK
 *
 * @param jwk - The JWK to check
 * @returns True if the JWK is a valid secp256k1 public key JWK
 */
export function isJwkSecp256k1(jwk: unknown): jwk is JwkSecp256k1 {
  return isJwkSecp256(jwk, "secp256k1")
}

/**
 * Check if an object is a valid secp256r1 public key (or private key) JWK
 *
 * @param jwk - The JWK to check
 * @returns True if the JWK is a valid secp256r1 public key JWK
 */
export function isJwkSecp256r1(jwk: unknown): jwk is JwkSecp256r1 {
  return isJwkSecp256(jwk, "secp256r1")
}

/**
 * Check if an object is a valid Ed25519 public key (or private key) JWK
 *
 * @param jwk - The JWK to check
 * @returns True if the JWK is a valid Ed25519 public key JWK
 */
export function isJwkEd25519(jwk: unknown): jwk is JwkEd25519 {
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

export function isJwk(jwk: unknown): jwk is Jwk {
  return isJwkSecp256k1(jwk) || isJwkSecp256r1(jwk) || isJwkEd25519(jwk)
}

/**
 * Check if an object is a valid public key JWK
 */
export function isPublicKeyJwk(jwk: unknown): jwk is PublicKeyJwk {
  return isJwk(jwk) && !("d" in jwk)
}

export function isPublicKeyJwkSecp256k1(
  jwk: unknown
): jwk is PublicKeyJwkSecp256k1 {
  return isJwkSecp256k1(jwk) && isPublicKeyJwk(jwk)
}

export function isPublicKeyJwkSecp256r1(
  jwk: unknown
): jwk is PublicKeyJwkSecp256r1 {
  return isJwkSecp256r1(jwk) && isPublicKeyJwk(jwk)
}

export function isPublicKeyJwkEd25519(
  jwk: unknown
): jwk is PublicKeyJwkEd25519 {
  return isJwkEd25519(jwk) && isPublicKeyJwk(jwk)
}

/**
 * Check if an object is a valid private key JWK
 */
export function isPrivateKeyJwk(jwk: unknown): jwk is PrivateKeyJwk {
  return isJwk(jwk) && !!jwk.d
}

export function isPrivateKeyJwkSecp256k1(
  jwk: unknown
): jwk is PrivateKeyJwkSecp256k1 {
  return isJwkSecp256k1(jwk) && isPrivateKeyJwk(jwk)
}

export function isPrivateKeyJwkSecp256r1(
  jwk: unknown
): jwk is PrivateKeyJwkSecp256r1 {
  return isJwkSecp256r1(jwk) && isPrivateKeyJwk(jwk)
}

export function isPrivateKeyJwkEd25519(
  jwk: unknown
): jwk is PrivateKeyJwkEd25519 {
  return isJwkEd25519(jwk) && isPrivateKeyJwk(jwk)
}

/**
 * Get the public key JWK from a private key JWK
 *
 * @param jwk - The private key JWK
 * @returns The public key JWK
 */
export function getPublicKeyJwk(
  jwk: PrivateKeyJwk | PublicKeyJwk
): PublicKeyJwk {
  if (isPrivateKeyJwk(jwk)) {
    const { d: _d, ...publicKeyJwk } = jwk
    return publicKeyJwk
  }

  return jwk
}

/**
 * Convert public key bytes to a JWK format
 */
export function publicKeyBytesToJwk(
  bytes: Uint8Array,
  curve: KeyCurve
): PublicKeyJwk {
  switch (curve) {
    case "Ed25519":
      return {
        kty: "OKP",
        crv: "Ed25519",
        x: bytesToBase64url(bytes)
      } as const

    case "secp256k1":
    case "secp256r1": {
      if (bytes.length !== 65) {
        throw new Error(`Invalid ${curve} public key length`)
      }

      // Skip the first byte (0x04) and take 32 bytes for x, then 32 bytes for y
      const xBytes = bytes.slice(1, 33)
      const yBytes = bytes.slice(33)
      return {
        kty: "EC",
        crv: curve,
        x: bytesToBase64url(xBytes),
        y: bytesToBase64url(yBytes)
      } as const
    }

    default:
      throw new Error(`Unsupported curve: ${curve}`)
  }
}

export function privateKeyBytesToJwk(
  bytes: Uint8Array,
  curve: KeyCurve
): PrivateKeyJwk {
  const publicKeyBytes = getPublicKeyFromPrivateKey(bytes, curve)
  const publicKeyJwk = publicKeyBytesToJwk(publicKeyBytes, curve)

  return {
    ...publicKeyJwk,
    d: bytesToBase64url(bytes)
  }
}

/**
 * }
 * Convert a JWK to public key bytes
 */
export function publicKeyJwkToBytes(jwk: PublicKeyJwk): Uint8Array {
  const xBytes = base64urlToBytes(jwk.x)

  // For secp256k1 and secp256r1, we need to reconstruct the full public key
  if (jwk.crv === "secp256k1" || jwk.crv === "secp256r1") {
    if ("y" in jwk && jwk.y) {
      const fullKey = new Uint8Array(65)
      fullKey[0] = 0x04 // Add the prefix byte
      fullKey.set(xBytes, 1) // Add the x-coordinate
      fullKey.set(base64urlToBytes(jwk.y), 33) // Add the y-coordinate
      return fullKey
    }
    throw new Error(`Missing y coordinate for ${jwk.crv} key`)
  }

  // For Ed25519, the x field is the complete public key
  return xBytes
}

/**
 * @deprecated Use `publicKeyBytesToJwk` instead
 */
export const bytesToJwk = publicKeyBytesToJwk

/**
 * @deprecated Use `publicKeyJwkToBytes` instead
 */
export const jwkToBytes = publicKeyJwkToBytes
