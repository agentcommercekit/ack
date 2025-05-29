import { compressPublicKey } from "./curves/secp256k1"
import { bytesToBase58 } from "./encoding/base58"
import { bytesToHexString } from "./encoding/hex"
import { bytesToJwk } from "./encoding/jwk"
import { bytesToMultibase } from "./encoding/multibase"
import type { PublicKeyJwk } from "./encoding/jwk"
import type { Keypair, KeypairAlgorithm } from "./types"

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
    algorithm: KeypairAlgorithm
    value: PublicKeyTypeMap[K]
  }
}[PublicKeyEncoding]

/**
 * Get the compressed public key for a given keypair
 * @param keypair - The keypair to get the compressed public key for
 * @returns The compressed public key
 */
export function getCompressedPublicKey(keypair: Keypair): Uint8Array {
  if (keypair.algorithm === "secp256k1") {
    return compressPublicKey(keypair)
  }

  return keypair.publicKey
}

/**
 * Convert a public key to a multibase string (used for DID:key)
 */
function encodePublicKeyMultibase(
  publicKey: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyWithEncoding & { encoding: "multibase" } {
  return {
    encoding: "multibase",
    algorithm,
    value: bytesToMultibase(publicKey)
  }
}

/**
 * Convert a public key to a JWK format
 */
function encodePublicKeyJwk(
  publicKey: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyWithEncoding & { encoding: "jwk" } {
  return {
    encoding: "jwk",
    algorithm,
    value: bytesToJwk(publicKey, algorithm)
  }
}

/**
 * Convert a public key to a hex string
 */
function encodePublicKeyHex(
  publicKey: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyWithEncoding & { encoding: "hex" } {
  return {
    encoding: "hex",
    algorithm,
    value: bytesToHexString(publicKey)
  }
}

/**
 * Convert a public key to a base58 string
 */
function encodePublicKeyBase58(
  publicKey: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyWithEncoding & { encoding: "base58" } {
  return {
    encoding: "base58",
    algorithm,
    value: bytesToBase58(publicKey)
  }
}

/**
 * A map of public key encoders
 */
const publicKeyEncoders: {
  [K in PublicKeyEncoding]: (
    publicKey: Uint8Array,
    algorithm: KeypairAlgorithm
  ) => PublicKeyWithEncoding & { encoding: K }
} = {
  hex: encodePublicKeyHex,
  jwk: encodePublicKeyJwk,
  multibase: encodePublicKeyMultibase,
  base58: encodePublicKeyBase58
} as const

/**
 * Encode a raw public key to the specified format
 */
export function encodePublicKey<T extends PublicKeyEncoding>(
  encoding: T,
  publicKey: Uint8Array,
  algorithm: KeypairAlgorithm
): PublicKeyWithEncoding & { encoding: T } {
  return publicKeyEncoders[encoding](publicKey, algorithm)
}

/**
 * Encode a public key from a keypair to the specified format
 */
export function encodePublicKeyFromKeypair<T extends PublicKeyEncoding>(
  encoding: T,
  keypair: Keypair
): PublicKeyWithEncoding & { encoding: T } {
  return encodePublicKey(encoding, keypair.publicKey, keypair.algorithm)
}
