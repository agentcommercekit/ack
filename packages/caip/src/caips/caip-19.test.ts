import { describe, expect, it } from "vitest"

import {
  caip19AssetIdRegex,
  caip19AssetNameRegex,
  caip19AssetNamespaceRegex,
  caip19AssetReferenceRegex,
  caip19AssetTypeRegex,
  caip19TokenIdRegex,
} from "./index"

describe("caip19AssetNamespaceRegex", () => {
  it("matches a valid asset namespace", () => {
    expect(caip19AssetNamespaceRegex.test("erc20")).toBe(true)
  })

  it("matches a namespace with hyphens", () => {
    expect(caip19AssetNamespaceRegex.test("erc-20")).toBe(true)
  })

  it("rejects a namespace shorter than 3 characters", () => {
    expect(caip19AssetNamespaceRegex.test("ab")).toBe(false)
  })

  it("rejects a namespace longer than 8 characters", () => {
    expect(caip19AssetNamespaceRegex.test("abcdefghi")).toBe(false)
  })

  it("rejects uppercase characters", () => {
    expect(caip19AssetNamespaceRegex.test("ERC20")).toBe(false)
  })
})

describe("caip19AssetReferenceRegex", () => {
  it("matches a contract address", () => {
    expect(
      caip19AssetReferenceRegex.test(
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      ),
    ).toBe(true)
  })

  it("matches a reference with dots and percent signs", () => {
    expect(caip19AssetReferenceRegex.test("token.ref%20")).toBe(true)
  })

  it("rejects an empty reference", () => {
    expect(caip19AssetReferenceRegex.test("")).toBe(false)
  })

  it("rejects a reference longer than 128 characters", () => {
    const longRef = "a".repeat(129)
    expect(caip19AssetReferenceRegex.test(longRef)).toBe(false)
  })
})

describe("caip19AssetNameRegex", () => {
  it("matches a valid ERC-20 asset name", () => {
    expect(
      caip19AssetNameRegex.test(
        "erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      ),
    ).toBe(true)
  })

  it("matches a valid ERC-721 asset name", () => {
    expect(
      caip19AssetNameRegex.test(
        "erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      ),
    ).toBe(true)
  })

  it("rejects an asset name without a colon separator", () => {
    expect(caip19AssetNameRegex.test("erc20-0xabc")).toBe(false)
  })
})

describe("caip19AssetTypeRegex", () => {
  it("matches a valid ERC-20 asset type", () => {
    expect(
      caip19AssetTypeRegex.test(
        "eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      ),
    ).toBe(true)
  })

  it("matches a valid asset type on Base", () => {
    expect(
      caip19AssetTypeRegex.test(
        "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      ),
    ).toBe(true)
  })

  it("rejects an asset type missing the chain ID", () => {
    expect(
      caip19AssetTypeRegex.test(
        "erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      ),
    ).toBe(false)
  })

  it("rejects an asset type with an invalid namespace", () => {
    expect(
      caip19AssetTypeRegex.test(
        "XX:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      ),
    ).toBe(false)
  })
})

describe("caip19TokenIdRegex", () => {
  it("matches a numeric token ID", () => {
    expect(caip19TokenIdRegex.test("1234")).toBe(true)
  })

  it("matches an alphanumeric token ID", () => {
    expect(caip19TokenIdRegex.test("token-1.2")).toBe(true)
  })

  it("rejects an empty token ID", () => {
    expect(caip19TokenIdRegex.test("")).toBe(false)
  })

  it("rejects a token ID longer than 78 characters", () => {
    const longId = "a".repeat(79)
    expect(caip19TokenIdRegex.test(longId)).toBe(false)
  })
})

describe("caip19AssetIdRegex", () => {
  it("matches a valid ERC-721 asset ID with token ID", () => {
    expect(
      caip19AssetIdRegex.test(
        "eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234",
      ),
    ).toBe(true)
  })

  it("matches a valid asset ID on Arbitrum", () => {
    expect(
      caip19AssetIdRegex.test(
        "eip155:42161/erc721:0xabc123def456abc123def456abc123def456abc1/99",
      ),
    ).toBe(true)
  })

  it("rejects an asset ID without a token ID", () => {
    expect(
      caip19AssetIdRegex.test(
        "eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      ),
    ).toBe(false)
  })

  it("rejects an asset ID with an invalid chain namespace", () => {
    expect(
      caip19AssetIdRegex.test(
        "XX:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234",
      ),
    ).toBe(false)
  })
})
