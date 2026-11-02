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

  describe("did:jwks timeout", () => {
    it("aborts a did:jwks fetch that exceeds the configured timeout", async () => {
      // A host that never answers: the request settles only when its signal
      // aborts.
      const mockFetch = vi.fn<FetchLike>(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(init.signal?.reason)
            })
          }),
      )

      const resolver = getDidResolver({
        webOptions: { fetch: mockFetch, timeout: 50 },
      })
      const result = await resolver.resolve("did:jwks:example.com")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/jwks.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
      expect(result.didDocument).toBeNull()
      expect(result.didResolutionMetadata.error).toBeDefined()
    })

    it("applies the 5000ms default timeout to did:jwks fetches", async () => {
      const mockFetch = vi
        .fn<FetchLike>()
        .mockResolvedValue(new Response(null, { status: 404 }))
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout")

      try {
        const resolver = getDidResolver({ webOptions: { fetch: mockFetch } })
        await resolver.resolve("did:jwks:example.com")

        expect(timeoutSpy).toHaveBeenCalledWith(5000)
        expect(mockFetch).toHaveBeenCalledWith(
          "https://example.com/.well-known/jwks.json",
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
        expect(mockFetch).toHaveBeenCalledWith(
          "https://example.com/.well-known/openid-configuration",
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      } finally {
        timeoutSpy.mockRestore()
      }
    })
  })
})
