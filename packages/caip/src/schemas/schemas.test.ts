import { describe, expect, it } from "vitest"

import type {
  Caip2ChainId,
  Caip10AccountId,
  Caip19AssetId,
  Caip19AssetName,
  Caip19AssetType,
} from "../caips"

import * as valibot from "./valibot"
import * as zodv3 from "./zod/v3"
import * as zodv4 from "./zod/v4"

const schemas = {
  valibot,
  zodv3,
  zodv4,
}

describe.each(Object.entries(schemas))("CAIP (%s)", (_name, schemas) => {
  describe("CAIP-2 Chain ID Schema", () => {
    it("validates correct CAIP-2 chain IDs", () => {
      const validChainIds = [
        "eip155:1",
        "eip155:11155111",
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "bitcoin:mainnet",
        "cosmos:cosmoshub-4",
      ]

      for (const chainId of validChainIds) {
        expect(chainId).toMatchSchema(schemas.caip2ChainIdSchema)
        expect(schemas.isCaip2ChainId(chainId)).toBe(true)
      }
    })

    it("rejects invalid CAIP-2 chain IDs", () => {
      const invalidChainIds = [
        "eip155",
        ":1",
        "eip155:",
        "",
        "ab:1", // too short namespace
        "verylongnamespace:1", // too long namespace
        "EIP155:1", // uppercase not allowed in namespace
        "eip-155:1", // hyphen not allowed in namespace
      ]

      for (const chainId of invalidChainIds) {
        expect(chainId).not.toMatchSchema(schemas.caip2ChainIdSchema)
        expect(schemas.isCaip2ChainId(chainId)).toBe(false)
      }
    })
  })

  describe("CAIP-10 Account ID Schema", () => {
    it("validates correct CAIP-10 account IDs", () => {
      const validAccountIds = [
        "eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "bitcoin:mainnet:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      ]

      for (const accountId of validAccountIds) {
        expect(accountId).toMatchSchema(schemas.caip10AccountIdSchema)
      }
    })

    it("rejects invalid CAIP-10 account IDs", () => {
      const invalidAccountIds = [
        "eip155:1",
        "eip155:1:",
        "eip155::0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "",
      ]

      for (const accountId of invalidAccountIds) {
        expect(accountId).not.toMatchSchema(schemas.caip10AccountIdSchema)
      }
    })
  })

  describe("CAIP-19 Asset Name Schema", () => {
    it("validates correct CAIP-19 asset names", () => {
      const validAssetNames = [
        "slip44:60",
        "erc20:0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c",
        "erc721:0xb0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c",
        "spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      ]

      for (const assetName of validAssetNames) {
        expect(assetName).toMatchSchema(schemas.caip19AssetNameSchema)
      }
    })

    it("rejects invalid CAIP-19 asset names", () => {
      const invalidAssetNames = [
        "eip155",
        "eip155:",
        ":erc20",
        "EIP155:erc20", // uppercase not allowed
        "",
      ]

      for (const assetName of invalidAssetNames) {
        expect(assetName).not.toMatchSchema(schemas.caip19AssetNameSchema)
      }
    })
  })

  describe("CAIP-19 Asset Type Schema", () => {
    it("validates correct CAIP-19 asset types", () => {
      const validAssetTypes = [
        "eip155:1/erc20:0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c",
        "eip155:11155111/erc721:0xb0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c",
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      ]

      for (const assetType of validAssetTypes) {
        expect(assetType).toMatchSchema(schemas.caip19AssetTypeSchema)
      }
    })

    it("rejects invalid CAIP-19 asset types", () => {
      const invalidAssetTypes = [
        "eip155:1",
        "eip155:1/eip155",
        "eip155:1/eip155:",
        "invalid/asset/type",
        "",
      ]

      for (const assetType of invalidAssetTypes) {
        expect(assetType).not.toMatchSchema(schemas.caip19AssetTypeSchema)
      }
    })
  })

  describe("CAIP-19 Asset ID Schema", () => {
    it("validates correct CAIP-19 asset IDs", () => {
      const validAssetIds = [
        "eip155:1/erc20:0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "eip155:11155111/erc721:0xb0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c/123",
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      ]

      for (const assetId of validAssetIds) {
        expect(assetId).toMatchSchema(schemas.caip19AssetIdSchema)
      }
    })

    it("rejects invalid CAIP-19 asset IDs", () => {
      const invalidAssetIds = [
        "eip155:1/eip155:erc20",
        "eip155:1/eip155:erc20/",
        "eip155:1//0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "invalid/asset/id/format",
        "",
      ]

      for (const assetId of invalidAssetIds) {
        expect(assetId).not.toMatchSchema(schemas.caip19AssetIdSchema)
      }
    })
  })

  describe("Type Inference", () => {
    it("has correct type inference for CAIP-2", () => {
      const chainId: Caip2ChainId = "eip155:1"
      expect(typeof chainId).toBe("string")
    })

    it("has correct type inference for CAIP-10", () => {
      const accountId: Caip10AccountId =
        "eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      expect(typeof accountId).toBe("string")
    })

    it("has correct type inference for CAIP-19 Asset Name", () => {
      const assetName: Caip19AssetName = "slip44:60"
      expect(typeof assetName).toBe("string")
    })

    it("has correct type inference for CAIP-19 Asset Type", () => {
      const assetType: Caip19AssetType =
        "eip155:1/erc20:0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c"
      expect(typeof assetType).toBe("string")
    })

    it("has correct type inference for CAIP-19 Asset ID", () => {
      const assetId: Caip19AssetId =
        "eip155:1/erc20:0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      expect(typeof assetId).toBe("string")
    })
  })
})
