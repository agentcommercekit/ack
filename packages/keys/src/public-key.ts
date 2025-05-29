import { compressPublicKey } from "./curves/secp256k1"
import { bytesToBase58 } from "./encoding/base58"
import { bytesToBase64 } from "./encoding/base64"
import { bytesToHexString } from "./encoding/hex"
import { bytesToJwk } from "./encoding/jwk"
import { bytesToMultibase } from "./encoding/multibase"
import type { PublicKeyJwk } from "./encoding/jwk"
import type { Keypair } from "./types"

/**
 * Public key format types
 */
export const publicKeyFormats = [
  "hex",
  "jwk",
  "multibase",
  "base58",
  "base64"
] as const
export type PublicKeyFormat = (typeof publicKeyFormats)[number]
export type PublicKeyTypeMap = {
  hex: string
  jwk: PublicKeyJwk
  multibase: string
  base58: string
  base64: string
}

export function getCompressedPublicKey(keypair: Keypair): Uint8Array {
  if (keypair.algorithm === "secp256k1") {
    return compressPublicKey(keypair)
  }

  return keypair.publicKey
}

/**
 * Convert a public key to a multibase string (used for DID:key)
 * @param keypair - The Keypair containing the public key
 * @returns A multibase string representation of the public key
 */
export function formatPublicKeyMultibase(keypair: Keypair): string {
  return bytesToMultibase(keypair.publicKey)
}

/**
 * Convert a public key to a JWK format
 * @param keypair - The Keypair containing the public key
 * @returns A JSON Web Key representation of the public key
 */
export function formatPublicKeyJwk(keypair: Keypair): PublicKeyJwk {
  return bytesToJwk(keypair.publicKey, keypair.algorithm)
}

/**
 * Convert a public key to a hex string
 * @param keypair - The Keypair containing the public key
 * @returns A hex string representation of the public key
 */
export function formatPublicKeyHex(keypair: Keypair): string {
  return bytesToHexString(keypair.publicKey)
}

/**
 * Convert a public key to a base58 string
 * @param keypair - The Keypair containing the public key
 * @returns A base58 string representation of the public key
 */
export function formatPublicKeyBase58(keypair: Keypair): string {
  return bytesToBase58(keypair.publicKey)
}

/**
 * Convert a public key to a base64 string
 * @param keypair - The Keypair containing the public key
 * @returns A base64 string representation of the public key
 */
export function formatPublicKeyBase64(keypair: Keypair): string {
  return bytesToBase64(keypair.publicKey)
}

export const publicKeyFormatters = {
  hex: (keypair: Keypair) => formatPublicKeyHex(keypair),
  jwk: (keypair: Keypair) => formatPublicKeyJwk(keypair),
  multibase: (keypair: Keypair) => formatPublicKeyMultibase(keypair),
  base58: (keypair: Keypair) => formatPublicKeyBase58(keypair),
  base64: (keypair: Keypair) => formatPublicKeyBase64(keypair)
} as const

/**
 * Convert a public key to the specified format with correct type inference
 */
export function formatPublicKey<T extends PublicKeyFormat>(
  keypair: Keypair,
  format: T
): ReturnType<(typeof publicKeyFormatters)[T]> {
  return publicKeyFormatters[format](keypair) as ReturnType<
    (typeof publicKeyFormatters)[T]
  >
}
