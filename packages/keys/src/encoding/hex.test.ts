import { describe, expect, test } from "vitest"
import { bytesToHexString, hexStringToBytes, isHexString } from "./hex"

describe("hex encoding and decoding", () => {
  test("converts bytes to hex string", () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const hex = bytesToHexString(bytes)
    expect(hex).toBe("01020304")
  })

  test("converts hex string with 0x prefix to bytes", () => {
    const hex = "0x01020304"
    const bytes = hexStringToBytes(hex)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  test("handles hex strings in caps", () => {
    const hex = "0XABCDEF"
    const bytes = hexStringToBytes(hex)
    expect(bytes).toEqual(new Uint8Array([171, 205, 239]))
  })

  test("converts hex string without 0x prefix to bytes", () => {
    const hex = "01020304"
    const bytes = hexStringToBytes(hex)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  test("roundtrip hex encoding", () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const hex = bytesToHexString(original)
    const bytes = hexStringToBytes(hex)
    expect(bytes).toEqual(original)
  })
})

describe("isHexString", () => {
  test("returns true for valid hex strings with 0x prefix", () => {
    expect(isHexString("0x1234567890abcdef")).toBe(true)
  })

  test("returns true for valid hex strings without 0x prefix", () => {
    expect(isHexString("1234567890abcdef")).toBe(true)
  })

  test("returns false for invalid hex strings", () => {
    expect(isHexString("0x1234567890abcdefg")).toBe(false)
    expect(isHexString("not hex")).toBe(false)
    expect(isHexString(123)).toBe(false)
  })
})
