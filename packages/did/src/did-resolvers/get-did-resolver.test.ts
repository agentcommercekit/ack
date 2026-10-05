import { describe, expect, it, vi } from "vitest"

import type { FetchLike } from "../types"
import { getDidResolver } from "./get-did-resolver"

const notFound = () =>
  vi.fn<FetchLike>().mockResolvedValue(new Response(null, { status: 404 }))

describe("getDidResolver", () => {
  describe("plain http policy", () => {
    it("resolves did:web over https only by default, even for loopback hosts", async () => {
      const mockFetch = notFound()
      const resolver = getDidResolver({ webOptions: { fetch: mockFetch } })

      await resolver.resolve("did:web:localhost%3A8787")
      await resolver.resolve("did:web:127.0.0.1%3A6379")

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://localhost:8787/.well-known/did.json",
        expect.anything(),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://127.0.0.1:6379/.well-known/did.json",
        expect.anything(),
      )
    })

    it("resolves did:web over https when webOptions is omitted entirely", async () => {
      const mockFetch = notFound()
      vi.stubGlobal("fetch", mockFetch)

      try {
        await getDidResolver().resolve("did:web:127.0.0.1%3A6379")

        expect(mockFetch).toHaveBeenCalledWith(
          "https://127.0.0.1:6379/.well-known/did.json",
          expect.anything(),
        )
        expect(mockFetch).not.toHaveBeenCalledWith(
          expect.stringMatching(/^http:/),
          expect.anything(),
        )
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it("resolves did:jwks over https only by default, even for loopback hosts", async () => {
      const mockFetch = notFound()
      const resolver = getDidResolver({ webOptions: { fetch: mockFetch } })

      await resolver.resolve("did:jwks:localhost%3A3000")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://localhost:3000/.well-known/jwks.json",
        expect.anything(),
      )
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringMatching(/^http:/),
        expect.anything(),
      )
    })

    it("uses plain http for did:web when the host is explicitly allowed", async () => {
      const mockFetch = notFound()
      const resolver = getDidResolver({
        webOptions: { fetch: mockFetch, allowedHttpHosts: ["localhost"] },
      })

      await resolver.resolve("did:web:localhost%3A8787")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/.well-known/did.json",
        expect.anything(),
      )
    })
  })

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
