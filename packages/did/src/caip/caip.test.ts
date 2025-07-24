import { describe, expect, it } from "vitest"
import { isCaip2ChainId } from "./caip"

describe("isCaip2ChainId", () => {
  it("returns true for valid CAIP-2 chain IDs", () => {
    expect(isCaip2ChainId("eip155:1")).toBe(true)
    expect(isCaip2ChainId("eip155:11155111")).toBe(true)
    expect(isCaip2ChainId("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")).toBe(true)
    expect(isCaip2ChainId("bitcoin:mainnet")).toBe(true)
    expect(isCaip2ChainId("cosmos:cosmoshub-4")).toBe(true)
  })

  it("returns false for invalid chain IDs", () => {
    expect(isCaip2ChainId("invalid")).toBe(false)
    expect(isCaip2ChainId("eip155")).toBe(false)
    expect(isCaip2ChainId(":1")).toBe(false)
    expect(isCaip2ChainId("eip155:")).toBe(false)
    expect(isCaip2ChainId("")).toBe(false)
    expect(isCaip2ChainId(null)).toBe(false)
    expect(isCaip2ChainId(undefined)).toBe(false)
    expect(isCaip2ChainId(123)).toBe(false)
  })

  it("returns false for chain IDs with invalid namespace length", () => {
    expect(isCaip2ChainId("ab:1")).toBe(false) // too short
    expect(isCaip2ChainId("verylongnamespace:1")).toBe(false) // too long
  })

  it("returns false for chain IDs with invalid characters", () => {
    expect(isCaip2ChainId("EIP155:1")).toBe(false) // uppercase not allowed in namespace
    expect(isCaip2ChainId("eip-155:1")).toBe(false) // hyphen not allowed in namespace
  })
})
