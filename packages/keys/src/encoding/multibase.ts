import { base16 } from "multiformats/bases/base16"
import { base58btc } from "multiformats/bases/base58"
import { base64url } from "multiformats/bases/base64"

/**
 * Supported multibase encodings and their prefixes
 */
const MULTIBASE_PREFIX = {
  base58btc: "z", // Bitcoin's base58 (default)
  base64url: "u", // URL-safe base64
  base16: "f", // hex
} as const

export type MultibaseEncoding = keyof typeof MULTIBASE_PREFIX

export type MultibaseString<T extends MultibaseEncoding> = T extends "base58btc"
  ? `z${string}`
  : T extends "base64url"
    ? `u${string}`
    : T extends "base16"
      ? `f${string}`
      : string

const multibaseEncoders = {
  base58btc,
  base64url,
  base16,
} as const

/**
 * Encodes bytes to a multibase string
 * @param bytes The bytes to encode
 * @param encoding The multibase encoding to use (defaults to base58btc)
 * @returns A multibase string with the appropriate prefix
 */
export function bytesToMultibase<T extends MultibaseEncoding = "base58btc">(
  bytes: Uint8Array,
  encoding?: T,
): MultibaseString<T> {
  const actualEncoding = (encoding ?? "base58btc") as T
  const encoder = multibaseEncoders[actualEncoding]
  return encoder.encode(bytes) as MultibaseString<T>
}

/**
 * Decodes a multibase string to bytes
 * @param multibase The multibase string to decode
 * @returns The decoded bytes
 * @throws Error if the multibase string is invalid
 */
export function multibaseToBytes(multibase: string): Uint8Array {
  if (multibase.length === 0) {
    throw new Error("Empty multibase string")
  }

  const prefix = multibase[0]
  const encoding = getMultibaseEncoding(multibase)

  if (!encoding) {
    throw new Error(`Unsupported multibase prefix: ${prefix}`)
  }

  const encoder = multibaseEncoders[encoding]
  return encoder.decode(multibase)
}

/**
 * Gets the encoding type from a multibase string
 * @param multibase The multibase string
 * @returns The encoding type or undefined if invalid
 */
export function getMultibaseEncoding(
  multibase: string,
): MultibaseEncoding | undefined {
  if (multibase.length === 0) return undefined

  const prefix = multibase[0]
  for (const [encoding, encodingPrefix] of Object.entries(MULTIBASE_PREFIX)) {
    if (prefix === encodingPrefix) {
      return encoding as MultibaseEncoding
    }
  }
  return undefined
}

/**
 * Check if a string is valid multibase encoded
 */
export function isMultibase(str: unknown): str is string {
  if (typeof str !== "string" || str.length === 0) {
    return false
  }

  const encoding = getMultibaseEncoding(str)
  if (!encoding) {
    return false
  }

  try {
    const encoder = multibaseEncoders[encoding]
    encoder.decode(str)
    return true
  } catch {
    return false
  }
}
