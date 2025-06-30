import { describe, expect, it, vi } from "vitest"
import { createDidDocument } from "../create-did-document"
import { DidResolver } from "./did-resolver"

describe("DidResolver", () => {
  const resolver = new DidResolver()
  const did = `did:example:123`
  const didDocument = createDidDocument({
    did,
    publicKey: {
      encoding: "hex",
      curve: "secp256k1",
      value: "0xc0ffee254729296a45a3885639AC7E10F9d54979"
    }
  })

  it("returns empty result for non-matching Did", async () => {
    const result = await resolver.resolve("did:example:456")

    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata).toEqual({
      error: "unsupportedDidMethod"
    })
    expect(result.didDocumentMetadata).toEqual({})
  })

  describe("addToCache", () => {
    it("returns Did document for matching Did", async () => {
      const date = new Date()
      vi.setSystemTime(date)

      let result = await resolver.resolve(did)
      expect(result.didDocument).toBeNull()

      // Add the item to a cache
      resolver.addToCache(did, didDocument)
      result = await resolver.resolve(did)

      expect(result.didDocument).toEqual(didDocument)
      expect(result.didResolutionMetadata).toEqual({
        contentType: "application/did+json"
      })
      expect(result.didDocumentMetadata).toEqual({
        created: date.toISOString(),
        updated: date.toISOString()
      })
    })
  })

  describe("removeFromCache", () => {
    it("removes Did document from cache", async () => {
      resolver.addToCache(did, didDocument)
      let result = await resolver.resolve(did)
      expect(result.didDocument).toEqual(didDocument)

      resolver.removeFromCache(did)

      result = await resolver.resolve(did)
      expect(result.didDocument).toBeNull()
    })
  })

  describe("clearCache", () => {
    it("clears all Did documents from cache", async () => {
      resolver.addToCache(did, didDocument)
      let result = await resolver.resolve(did)
      expect(result.didDocument).toEqual(didDocument)

      resolver.clearCache()

      result = await resolver.resolve(did)
      expect(result.didDocument).toBeNull()
    })
  })
})
