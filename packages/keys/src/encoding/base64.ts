import { fromString } from "uint8arrays/from-string"
import { toString } from "uint8arrays/to-string"

/**
 * Convert bytes to a base64url string
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  return toString(bytes, "base64url")
}

/**
 * Convert a base64url string to bytes
 */
export function base64urlToBytes(base64: string): Uint8Array {
  return fromString(base64, "base64url")
}

/**
 * Check if a string is valid base64url encoded
 */
export function isBase64url(str: unknown): str is string {
  if (typeof str !== "string") {
    return false
  }
  try {
    // Try to decode it - if it succeeds, it's valid base64url
    fromString(str, "base64url")
    return true
  } catch {
    return false
  }
}
