import type { DIDResolutionResult, ParsedDID } from "did-resolver"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FetchLike } from "../types"
import { getResolver } from "./web-did-resolver"

type MockFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<unknown>

describe("web-did-resolver", () => {
  const mockFetch = vi.fn<MockFetch>()
  const mockDidDocument = {
    "@context": "https://www.w3.org/ns/did/v1",
    id: "did:web:example.com",
    verificationMethod: [],
  }

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("getResolver", () => {
    it("resolves a valid did:web document", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })

      const did = "did:web:example.com"
      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result).toEqual({
        didDocument: mockDidDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: { contentType: "application/did+ld+json" },
      })
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/did.json",
        { mode: "cors" },
      )
    })

    it("uses custom docPath when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })

      const did = "did:web:example.com"
      const resolver = getResolver({ docPath: "/custom/path/did.json" })
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/custom/path/did.json",
        { mode: "cors" },
      )
    })

    it("allows http for specified hosts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })

      const did = "did:web:localhost%3A8787"

      const resolver = getResolver({ allowedHttpHosts: ["localhost"] })
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "localhost",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/.well-known/did.json",
        { mode: "cors" },
      )
    })

    it("resolves path-based did:web documents at /:path/did.json", async () => {
      const pathDidDocument = {
        ...mockDidDocument,
        id: "did:web:example.com:issuers:v1",
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(pathDidDocument),
      })

      const did = "did:web:example.com:issuers:v1"
      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com:issuers:v1",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/issuers/v1/did.json",
        { mode: "cors" },
      )
    })

    it("allows http for specified hosts with path-based did:web documents", async () => {
      const pathDidDocument = {
        ...mockDidDocument,
        id: "did:web:localhost%3A8787:issuers:v1",
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(pathDidDocument),
      })

      const did = "did:web:localhost%3A8787:issuers:v1"
      const resolver = getResolver({ allowedHttpHosts: ["localhost"] })
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "localhost%3A8787:issuers:v1",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/issuers/v1/did.json",
        { mode: "cors" },
      )
    })

    it("handles fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did: "did:web:example.com",
        didUrl: "did:web:example.com",
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        "did:web:example.com",
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result).toEqual({
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "notFound",
          message: "resolver_error: Network error",
        },
      })
    })

    it("handles non-OK responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      })

      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did: "did:web:example.com",
        didUrl: "did:web:example.com",
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        "did:web:example.com",
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result).toEqual({
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "notFound",
          message:
            "resolver_error: DID must resolve to a valid https URL containing a JSON document: Bad response Not Found",
        },
      })
    })

    it("handles invalid DID documents", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "document" }),
      })

      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did: "did:web:example.com",
        didUrl: "did:web:example.com",
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        "did:web:example.com",
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result).toEqual({
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "notFound",
          message:
            "resolver_error: DID must resolve to a valid https URL containing a JSON document: Invalid JSON DID document",
        },
      })
    })

    it("handles DID document with mismatched ID", async () => {
      const mismatchedDocument = {
        ...mockDidDocument,
        id: "did:web:different.com",
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mismatchedDocument),
      })

      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did: "did:web:example.com",
        didUrl: "did:web:example.com",
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        "did:web:example.com",
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result).toEqual({
        didDocument: mismatchedDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: "notFound",
          message:
            "resolver_error: DID document id does not match requested did",
        },
      })
    })

    it("uses custom fetch function when provided", async () => {
      const customFetch = vi.fn<FetchLike>().mockResolvedValueOnce(
        new Response(JSON.stringify(mockDidDocument), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )

      const resolver = getResolver({ fetch: customFetch })
      const parsedDid: ParsedDID = {
        did: "did:web:example.com",
        didUrl: "did:web:example.com",
        method: "web",
        id: "example.com",
      }
      await resolver.web(
        "did:web:example.com",
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(customFetch).toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("passes an abort signal built from the configured timeout", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout")

      const did = "did:web:example.com"
      const resolver = getResolver({ timeout: 5000 })
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(timeoutSpy).toHaveBeenCalledWith(5000)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/did.json",
        expect.objectContaining({
          mode: "cors",
          signal: expect.any(AbortSignal),
        }),
      )
      timeoutSpy.mockRestore()
    })

    it("does not pass a signal when no timeout is set", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })

      const did = "did:web:example.com"
      const resolver = getResolver()
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com",
      }
      await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      // Exact init, so this fails if a signal (or anything else) is added.
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/did.json",
        { mode: "cors" },
      )
    })

    it("throws for an invalid timeout", () => {
      expect(() => getResolver({ timeout: 0 })).toThrow(TypeError)
      expect(() => getResolver({ timeout: -1 })).toThrow(TypeError)
      expect(() => getResolver({ timeout: 1.5 })).toThrow(TypeError)
      expect(() => getResolver({ timeout: NaN })).toThrow(TypeError)
    })

    it("surfaces a timed-out fetch as a notFound resolution error", async () => {
      mockFetch.mockRejectedValueOnce(
        new DOMException("The operation timed out.", "TimeoutError"),
      )

      const did = "did:web:example.com"
      const resolver = getResolver({ timeout: 1 })
      const parsedDid: ParsedDID = {
        did,
        didUrl: did,
        method: "web",
        id: "example.com",
      }
      const result = await resolver.web(
        did,
        parsedDid,
        {
          resolve:
            vi.fn<
              (didUrl: string, options?: object) => Promise<DIDResolutionResult>
            >(),
        },
        {},
      )

      expect(result.didDocument).toBeNull()
      expect(result.didResolutionMetadata.error).toBe("notFound")
      expect(result.didResolutionMetadata.message).toContain(
        "The operation timed out.",
      )
    })
  })
})
