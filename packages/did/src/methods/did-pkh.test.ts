import { describe, expect, it } from "vitest"
import {
  addressFromDidPkhUri,
  createDidPkhDocument,
  createDidPkhUri,
  didPkhParts,
  isDidPkhUri
} from "./did-pkh"

describe("didPkhParts", () => {
  it("parses valid did:pkh URIs correctly", () => {
    const result = didPkhParts(
      "did:pkh:eip155:1:0x1234567890123456789012345678901234567890"
    )
    expect(result).toEqual([
      "did",
      "pkh",
      "eip155",
      "1",
      "0x1234567890123456789012345678901234567890"
    ])
  })

  it("parses Solana did:pkh URIs correctly", () => {
    const result = didPkhParts(
      "did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
    expect(result).toEqual([
      "did",
      "pkh",
      "solana",
      "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    ])
  })

  it("throws error for non-did:pkh URIs", () => {
    expect(() => didPkhParts("did:key:123")).toThrow("Invalid did:pkh URI")
    expect(() => didPkhParts("did:pkh")).toThrow("Invalid did:pkh URI")
    expect(() => didPkhParts("not-a-did")).toThrow("Invalid did:pkh URI")
  })

  it("throws error for incomplete did:pkh URIs", () => {
    expect(() => didPkhParts("did:pkh:")).toThrow("Invalid did:pkh URI")
    expect(() => didPkhParts("did:pkh:eip155")).toThrow("Invalid did:pkh URI")
    expect(() => didPkhParts("did:pkh:eip155:")).toThrow("Invalid did:pkh URI")
  })

  it("throws error for invalid chain IDs", () => {
    expect(() => didPkhParts("did:pkh:ab:1:0x123")).toThrow(
      "Invalid did:pkh URI"
    )
  })

  it("throws error for non-string inputs", () => {
    expect(() => didPkhParts(null as unknown as string)).toThrow(
      "Invalid did:pkh URI"
    )
    expect(() => didPkhParts(undefined as unknown as string)).toThrow(
      "Invalid did:pkh URI"
    )
    expect(() => didPkhParts(123 as unknown as string)).toThrow(
      "Invalid did:pkh URI"
    )
  })
})

describe("isDidPkhUri", () => {
  it("returns true for valid did:pkh URIs", () => {
    expect(
      isDidPkhUri("did:pkh:eip155:1:0x1234567890123456789012345678901234567890")
    ).toBe(true)
    expect(
      isDidPkhUri(
        "did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
      )
    ).toBe(true)
    expect(
      isDidPkhUri("did:pkh:bitcoin:mainnet:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
    ).toBe(true)
  })

  it("returns false for invalid URIs", () => {
    expect(isDidPkhUri("did:key:123")).toBe(false)
    expect(isDidPkhUri("did:pkh:ab:1:0x123")).toBe(false)
    expect(isDidPkhUri("not-a-did")).toBe(false)
    expect(isDidPkhUri("")).toBe(false)
    expect(isDidPkhUri(null)).toBe(false)
    expect(isDidPkhUri(undefined)).toBe(false)
    expect(isDidPkhUri(123)).toBe(false)
  })
})

describe("addressFromDidPkhUri", () => {
  it("extracts address from EVM did:pkh URI", () => {
    const address = addressFromDidPkhUri(
      "did:pkh:eip155:1:0x1234567890123456789012345678901234567890"
    )
    expect(address).toBe("0x1234567890123456789012345678901234567890")
  })

  it("extracts address from Solana did:pkh URI", () => {
    const address = addressFromDidPkhUri(
      "did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
    expect(address).toBe("FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P")
  })

  it("extracts address from Bitcoin did:pkh URI", () => {
    const address = addressFromDidPkhUri(
      "did:pkh:bitcoin:mainnet:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    )
    expect(address).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
  })

  it("throws error for invalid did:pkh URI", () => {
    expect(() => addressFromDidPkhUri("did:key:123")).toThrow(
      "Invalid did:pkh URI"
    )
  })
})

describe("createDidPkhUri", () => {
  it("creates did:pkh URI for EVM address", () => {
    const result = createDidPkhUri(
      "eip155:1",
      "0x1234567890123456789012345678901234567890"
    )
    expect(result).toBe(
      "did:pkh:eip155:1:0x1234567890123456789012345678901234567890"
    )
  })

  it("creates did:pkh URI for Solana address", () => {
    const result = createDidPkhUri(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
    expect(result).toBe(
      "did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
  })
})

describe("createDidPkhDocument", () => {
  it("creates did:pkh document for EVM address with secp256k1 keypair", () => {
    const result = createDidPkhDocument({
      address: "0x1234567890123456789012345678901234567890",
      chainId: "eip155:1"
    })

    expect(result.did).toBe(
      "did:pkh:eip155:1:0x1234567890123456789012345678901234567890"
    )
    expect(result.didDocument["@context"]).toContain(
      "https://identity.foundation/EcdsaSecp256k1RecoverySignature2020#EcdsaSecp256k1RecoveryMethod2020"
    )
    expect(result.didDocument["@context"]).toContain(
      "https://w3id.org/security#blockchainAccountId"
    )
    expect(result.didDocument.verificationMethod).toHaveLength(1)
    expect(result.didDocument.verificationMethod?.[0]?.type).toBe(
      "EcdsaSecp256k1RecoveryMethod2020"
    )
    expect(
      result.didDocument.verificationMethod?.[0]?.blockchainAccountId
    ).toBe("eip155:1:0x1234567890123456789012345678901234567890")
  })

  it("creates did:pkh document for Solana address with Ed25519 keypair", () => {
    const result = createDidPkhDocument({
      address: "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P",
      chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
    })

    expect(result.did).toBe(
      "did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
    expect(result.didDocument["@context"]).toContain(
      "https://w3id.org/security#publicKeyJwk"
    )
    expect(result.didDocument["@context"]).toContain(
      "https://w3id.org/security#blockchainAccountId"
    )
    expect(result.didDocument.verificationMethod).toHaveLength(1)
    expect(
      result.didDocument.verificationMethod?.[0]?.blockchainAccountId
    ).toBe(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
    )
  })

  it("creates did:pkh document with custom controller", () => {
    const result = createDidPkhDocument({
      address: "0x1234567890123456789012345678901234567890",
      chainId: "eip155:1",
      controller: "did:key:zQ3sharFd8K3z6L9b5X5J7m8n9o0p1q2r3s4t5u6v7w8x9y0z"
    })

    expect(result.didDocument.controller).toBe(
      "did:key:zQ3sharFd8K3z6L9b5X5J7m8n9o0p1q2r3s4t5u6v7w8x9y0z"
    )
  })
})
