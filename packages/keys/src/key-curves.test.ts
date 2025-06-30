import { describe, expect, it } from "vitest"
import { isKeyCurve } from "./key-curves"

describe("isKeyCurve", () => {
  it("returns true for valid key curves", () => {
    expect(isKeyCurve("secp256k1")).toBe(true)
    expect(isKeyCurve("secp256r1")).toBe(true)
    expect(isKeyCurve("Ed25519")).toBe(true)
  })

  it("returns false for invalid key curves", () => {
    expect(isKeyCurve("EdDSA")).toBe(false)
    expect(isKeyCurve("invalid")).toBe(false)
    expect(isKeyCurve(123)).toBe(false)
    expect(isKeyCurve(true)).toBe(false)
    expect(isKeyCurve(false)).toBe(false)
    expect(isKeyCurve(null)).toBe(false)
    expect(isKeyCurve(undefined)).toBe(false)
  })
})
