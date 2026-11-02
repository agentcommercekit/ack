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
      expect(result.didResolutionMetadata.error).toBe("notFound")
    })

    it("reports a later non-timeout failure as internalError after an earlier fetch's timer fires", async () => {
      // The JWKS request answers 404 at 100ms, so did-jwks moves on to the
      // OpenID configuration, which fails at ~250ms: after the first
      // request's timer fired (200ms) but before its own (~300ms).
      const mockFetch = vi.fn<FetchLike>(
        (input) =>
          new Promise<Response>((resolve, reject) => {
            const url = input instanceof Request ? input.url : input.toString()
            if (url.endsWith("/.well-known/jwks.json")) {
              setTimeout(() => {
                resolve(new Response(null, { status: 404 }))
              }, 100)
            } else {
              setTimeout(() => {
                reject(new TypeError("fetch failed"))
              }, 150)
            }
          }),
      )

      const resolver = getDidResolver({
        webOptions: { fetch: mockFetch, timeout: 200 },
      })
      const result = await resolver.resolve("did:jwks:example.com")

      expect(result.didResolutionMetadata.error).toBe("internalError")
    })

    it("does not cache a timed-out did:jwks resolution when caching is enabled", async () => {
      const jwks = {
        keys: [
          {
            kty: "OKP",
            crv: "Ed25519",
            x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
          },
        ],
      }
      let hostIsUp = false
      const mockFetch = vi.fn<FetchLike>((input, init) => {
        const url = input instanceof Request ? input.url : input.toString()
        if (hostIsUp && url.endsWith("/.well-known/jwks.json")) {
          return Promise.resolve(Response.json(jwks))
        }
        if (hostIsUp) {
          return Promise.resolve(new Response(null, { status: 404 }))
        }
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason)
          })
        })
      })

      const resolver = getDidResolver({
        cache: true,
        webOptions: { fetch: mockFetch, timeout: 50 },
      })
      const first = await resolver.resolve("did:jwks:example.com")
      expect(first.didDocument).toBeNull()

      hostIsUp = true
      const second = await resolver.resolve("did:jwks:example.com")
      expect(second.didResolutionMetadata.error).toBeUndefined()
      expect(second.didDocument).not.toBeNull()
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
