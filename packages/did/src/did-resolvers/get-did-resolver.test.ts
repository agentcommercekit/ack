import { describe, expect, it, vi } from "vitest"

import type { FetchLike } from "../types"
import { getDidResolver } from "./get-did-resolver"

describe("getDidResolver", () => {
  describe("did:jwks redirect policy", () => {
    it("refuses redirects by default when resolving did:jwks", async () => {
      const mockFetch = vi
        .fn<FetchLike>()
        .mockResolvedValue(new Response(null, { status: 302 }))

      const resolver = getDidResolver({ webOptions: { fetch: mockFetch } })
      const result = await resolver.resolve("did:jwks:example.com")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/jwks.json",
        expect.objectContaining({ redirect: "manual" }),
      )
      expect(result.didDocument).toBeNull()
      expect(result.didResolutionMetadata.error).toBe("notFound")
    })

    it("follows redirects for did:jwks when followRedirects is true", async () => {
      const mockFetch = vi
        .fn<FetchLike>()
        .mockResolvedValue(new Response(null, { status: 404 }))

      const resolver = getDidResolver({
        webOptions: { fetch: mockFetch, followRedirects: true },
      })
      await resolver.resolve("did:jwks:example.com")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/jwks.json",
        expect.objectContaining({ redirect: "follow" }),
      )
    })

    it("applies the redirect policy to the global fetch when no custom fetch is given", async () => {
      const mockFetch = vi
        .fn<FetchLike>()
        .mockResolvedValue(new Response(null, { status: 302 }))
      vi.stubGlobal("fetch", mockFetch)

      try {
        const resolver = getDidResolver()
        await resolver.resolve("did:jwks:example.com")

        expect(mockFetch).toHaveBeenCalledWith(
          "https://example.com/.well-known/jwks.json",
          expect.objectContaining({ redirect: "manual" }),
        )
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})
