import { fromString } from "uint8arrays/from-string"
import { toString } from "uint8arrays/to-string"

/**
 * Convert bytes to a hex string
 *
 * @example
 * ```ts
 * bytesToHexString(new Uint8Array([1, 2, 3, 4])) // "01020304"
 * ```
 */
export function bytesToHexString(bytes: Uint8Array): string {
  return toString(bytes, "base16")
}

/**
 * Convert a hex string to bytes
 * Accepts both with and without 0x prefix
 *
 * @example
 * ```ts
 * hexStringToBytes("0x1234567890abcdef") // Uint8Array([1, 2, 3, 4])
 * hexStringToBytes("1234567890abcdef") // Uint8Array([1, 2, 3, 4])
 * ```
 */
export function hexStringToBytes(hex: string): Uint8Array {
  const hexWithoutPrefix = hex.toLowerCase().startsWith("0x")
    ? hex.slice(2)
    : hex
  return fromString(hexWithoutPrefix.toLowerCase(), "base16")
}

/**
 * Check if a string is a hex string. This method accepts both with and without
 * 0x prefix.
 *
 * @example
 * ```ts
 * isHexString("0x1234567890abcdef") // true
 * isHexString("1234567890abcdef") // true
 * isHexString("0x") // true
 * isHexString("0x1234567890abcdefg") // false
 * ```
 */
export function isHexString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }

  const hexWithoutPrefix = value.startsWith("0x") ? value.slice(2) : value
  return /^[0-9A-Fa-f]+$/.test(hexWithoutPrefix)
}
