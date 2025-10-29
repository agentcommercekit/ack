import { describe, expect, it } from "vitest"
import {
  curveToJwtAlgorithm,
  isJwtAlgorithm,
  jwtAlgorithms,
} from "./jwt-algorithm"

describe("isJwtAlgorithm", () => {
  it("returns true for valid JWT algorithms", () => {
    for (const algorithm of jwtAlgorithms) {
      expect(isJwtAlgorithm(algorithm)).toBe(true)
    }
  })

  it("returns false for invalid JWT algorithms", () => {
    expect(isJwtAlgorithm("invalid")).toBe(false)
  })
})

describe("curveToJwtAlgorithm", () => {
  it("returns the correct JWT algorithm for secp256k1", () => {
    expect(curveToJwtAlgorithm("secp256k1")).toBe("ES256K")
  })

  it("returns the correct JWT algorithm for secp256r1", () => {
    expect(curveToJwtAlgorithm("secp256r1")).toBe("ES256")
  })

  it("returns the correct JWT algorithm for Ed25519", () => {
    expect(curveToJwtAlgorithm("Ed25519")).toBe("EdDSA")
  })

  it("throws an error for an unsupported curve", () => {
    // @ts-expect-error - invalid curve
    expect(() => curveToJwtAlgorithm("invalid")).toThrow(
      "Unsupported curve: 'invalid'",
    )
  })
})
