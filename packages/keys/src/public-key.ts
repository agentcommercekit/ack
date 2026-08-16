import { varint } from "multiformats"

import * as ed25519 from "./curves/ed25519"
import * as secp256k1 from "./curves/secp256k1"
import * as secp256r1 from "./curves/secp256r1"
import { bytesToBase58 } from "./encoding/base58"
import { bytesToHexString } from "./encoding/hex"
import { publicKeyBytesToJwk, type PublicKeyJwk } from "./encoding/jwk"
import { bytesToMultibase } from "./encoding/multibase"
import { keyCurveMulticodecs, type KeyCurve } from "./key-curves"
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
 * Compress a public key, for curves that have a compressed point encoding.
 * Ed25519 keys have a single 32-byte encoding and are returned unchanged.
 */
function compressPublicKey(publicKey: Uint8Array, curve: KeyCurve): Uint8Array {
  if (curve === "secp256k1") {
    return secp256k1.compressPublicKey(publicKey)
  }

  if (curve === "secp256r1") {
    return secp256r1.compressPublicKey(publicKey)
  }

  return publicKey
}

/**
 * Encode a public key as a Multikey: the curve's multicodec code as a varint,
 * followed by the key bytes, multibase-encoded with base58-btc.
 *
 * This is the value a `Multikey` verification method's `publicKeyMultibase`
 * holds, and it is the same value that follows `did:key:` in a `did:key` URI
 * for the same key.
 *
 * @param publicKey - The raw public key bytes
 * @param curve - The curve the key belongs to
 * @returns The Multikey string
 */
export function publicKeyToMultikey(
  publicKey: Uint8Array,
  curve: KeyCurve,
): string {
  const compressed = compressPublicKey(publicKey, curve)
  const code = keyCurveMulticodecs[curve]
  const prefix = new Uint8Array(varint.encodingLength(code))
  varint.encodeTo(code, prefix, 0)

  const prefixed = new Uint8Array(prefix.length + compressed.length)
  prefixed.set(prefix)
  prefixed.set(compressed, prefix.length)

  return bytesToMultibase(prefixed)
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
    value: publicKeyToMultikey(publicKey, curve),
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
