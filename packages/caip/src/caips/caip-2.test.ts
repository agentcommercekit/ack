import { describe, expect, it } from "vitest"

import {
  caip2ChainIdRegex,
  caip2ChainIds,
  caip2NamespaceRegex,
  caip2Parts,
  caip2ReferenceRegex,
} from "./index"

describe("caip2Parts", () => {
  it("parses a valid EIP-155 chain ID", () => {
    const result = caip2Parts("eip155:1")
    expect(result).toEqual({ namespace: "eip155", reference: "1" })
  })

  it("parses a valid Solana chain ID", () => {
    const result = caip2Parts("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
    expect(result).toEqual({
      namespace: "solana",
      reference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    })
  })

  it("throws for an empty string", () => {
    expect(() => caip2Parts("" as `${string}:${string}`)).toThrow(
      "Invalid CAIP-2 chain ID",
    )
  })

  it("throws for a string without a colon", () => {
    expect(() => caip2Parts("eip155" as `${string}:${string}`)).toThrow(
      "Invalid CAIP-2 chain ID",
    )
  })

  it("throws when the reference is missing after the colon", () => {
    expect(() => caip2Parts("eip155:" as `${string}:${string}`)).toThrow(
      "Invalid CAIP-2 chain ID",
    )
  })
})

describe("caip2ChainIdRegex", () => {
  it("matches a valid EIP-155 chain ID", () => {
    expect(caip2ChainIdRegex.test("eip155:1")).toBe(true)
  })

  it("matches a valid Solana chain ID", () => {
    expect(
      caip2ChainIdRegex.test("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"),
    ).toBe(true)
  })

  it("matches a chain ID with hyphens and underscores in reference", () => {
    expect(caip2ChainIdRegex.test("abc:ref_with-chars")).toBe(true)
  })

  it("rejects a namespace shorter than 3 characters", () => {
    expect(caip2ChainIdRegex.test("ab:1")).toBe(false)
  })

  it("rejects a namespace longer than 8 characters", () => {
    expect(caip2ChainIdRegex.test("abcdefghi:1")).toBe(false)
  })

  it("rejects uppercase characters in namespace", () => {
    expect(caip2ChainIdRegex.test("EIP155:1")).toBe(false)
  })

  it("rejects an empty reference", () => {
    expect(caip2ChainIdRegex.test("eip155:")).toBe(false)
  })

  it("rejects a reference longer than 32 characters", () => {
    const longRef = "a".repeat(33)
    expect(caip2ChainIdRegex.test(`eip155:${longRef}`)).toBe(false)
  })

  it("rejects a chain ID without a colon", () => {
    expect(caip2ChainIdRegex.test("eip1551")).toBe(false)
  })
})

describe("caip2NamespaceRegex", () => {
  it("matches a valid namespace", () => {
    expect(caip2NamespaceRegex.test("eip155")).toBe(true)
  })

  it("rejects a namespace with uppercase letters", () => {
    expect(caip2NamespaceRegex.test("EIP155")).toBe(false)
  })
})

describe("caip2ReferenceRegex", () => {
  it("matches a numeric reference", () => {
    expect(caip2ReferenceRegex.test("1")).toBe(true)
  })

  it("matches an alphanumeric reference with hyphens and underscores", () => {
    expect(caip2ReferenceRegex.test("my_ref-123")).toBe(true)
  })

  it("rejects an empty reference", () => {
    expect(caip2ReferenceRegex.test("")).toBe(false)
  })
})

describe("caip2ChainIds", () => {
  it("returns the correct Ethereum mainnet chain ID", () => {
    expect(caip2ChainIds.ethereumMainnet).toBe("eip155:1")
  })

  it("returns the correct Base mainnet chain ID", () => {
    expect(caip2ChainIds.baseMainnet).toBe("eip155:8453")
  })

  it("returns the correct Solana mainnet chain ID", () => {
    expect(caip2ChainIds.solanaMainnet).toBe(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    )
  })

  it("returns the correct Arbitrum Sepolia chain ID", () => {
    expect(caip2ChainIds.arbitrumSepolia).toBe("eip155:421614")
  })
})
