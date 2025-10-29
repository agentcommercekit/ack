import * as ed25519 from "./curves/ed25519"
import * as secp256k1 from "./curves/secp256k1"
import * as secp256r1 from "./curves/secp256r1"
import { bytesToBase58 } from "./encoding/base58"
import { bytesToHexString } from "./encoding/hex"
import { publicKeyBytesToJwk, type PublicKeyJwk } from "./encoding/jwk"
import { bytesToMultibase } from "./encoding/multibase"
import type { KeyCurve } from "./key-curves"
import type { Keypair } from "./keypair"

/**
 * Public key format types
 */
export const publicKeyEncodings = ["hex", "jwk", "multibase", "base58"] as const
export type PublicKeyEncoding = (typeof publicKeyEncodings)[number]
export type PublicKeyTypeMap = {
  hex: string
  jwk: PublicKeyJwk
  multibase: string
  base58: string
}

/**
 * A type that represents a PublicKey with its encoding format and algorithm
 */
export type PublicKeyWithEncoding = {
  [K in PublicKeyEncoding]: {
    encoding: K
    curve: KeyCurve
    value: PublicKeyTypeMap[K]
  }
}[PublicKeyEncoding]

/**
 * Get the public key for a given keypair, in either compressed or uncompressed
 * format
 *
 * @param keypair - The keypair to get the compressed public key for
 * @param compressed - Whether to return the public key in compressed format
 * @returns The compressed public key
 */
export function getPublicKeyFromPrivateKey(
  privateKey: Uint8Array,
  curve: KeyCurve,
  compressed = false,
): Uint8Array {
  if (curve === "secp256k1") {
    return secp256k1.getPublicKeyBytes(privateKey, compressed)
  }

  if (curve === "secp256r1") {
    return secp256r1.getPublicKeyBytes(privateKey, compressed)
  }

  return ed25519.getPublicKeyBytes(privateKey)
}

/**
 * @deprecated Use `getPublicKeyFromPrivateKey` instead
 */
export function getCompressedPublicKey(keypair: Keypair): Uint8Array {
  return getPublicKeyFromPrivateKey(keypair.privateKey, keypair.curve, true)
}

/**
 * Check if a public key is valid for a given curve
 */
export function isValidPublicKey(
  publicKey: Uint8Array,
  curve: KeyCurve,
): boolean {
  if (curve === "secp256k1") {
    return secp256k1.isValidPublicKey(publicKey)
  }

  if (curve === "secp256r1") {
    return secp256r1.isValidPublicKey(publicKey)
  }

  return ed25519.isValidPublicKey(publicKey)
}

/**
 * Convert a public key to a multibase string (used for DID:key)
 */
function encodePublicKeyMultibase(
  publicKey: Uint8Array,
  curve: KeyCurve,
): PublicKeyWithEncoding & { encoding: "multibase" } {
  return {
    encoding: "multibase",
    curve,
    value: bytesToMultibase(publicKey),
  }
}

/**
 * Convert a public key to a JWK format
 */
function encodePublicKeyJwk(
  publicKey: Uint8Array,
  curve: KeyCurve,
): PublicKeyWithEncoding & { encoding: "jwk" } {
  return {
    encoding: "jwk",
    curve,
    value: publicKeyBytesToJwk(publicKey, curve),
  }
}

/**
 * Convert a public key to a hex string
 */
function encodePublicKeyHex(
  publicKey: Uint8Array,
  curve: KeyCurve,
): PublicKeyWithEncoding & { encoding: "hex" } {
  return {
    encoding: "hex",
    curve,
    value: bytesToHexString(publicKey),
  }
}

/**
 * Convert a public key to a base58 string
 */
function encodePublicKeyBase58(
  publicKey: Uint8Array,
  curve: KeyCurve,
): PublicKeyWithEncoding & { encoding: "base58" } {
  return {
    encoding: "base58",
    curve,
    value: bytesToBase58(publicKey),
  }
}

/**
 * A map of public key encoders
 */
const publicKeyEncoders: {
  [K in PublicKeyEncoding]: (
    publicKey: Uint8Array,
    curve: KeyCurve,
  ) => PublicKeyWithEncoding & { encoding: K }
} = {
  hex: encodePublicKeyHex,
  jwk: encodePublicKeyJwk,
  multibase: encodePublicKeyMultibase,
  base58: encodePublicKeyBase58,
} as const

/**
 * Encode a raw public key to the specified format
 */
export function encodePublicKey<T extends PublicKeyEncoding>(
  encoding: T,
  publicKey: Uint8Array,
  curve: KeyCurve,
): PublicKeyWithEncoding & { encoding: T } {
  return publicKeyEncoders[encoding](publicKey, curve)
}

/**
 * Encode a public key from a keypair to the specified format
 */
export function encodePublicKeyFromKeypair<T extends PublicKeyEncoding>(
  encoding: T,
  keypair: Keypair,
): PublicKeyWithEncoding & { encoding: T } {
  return encodePublicKey(encoding, keypair.publicKey, keypair.curve)
}
