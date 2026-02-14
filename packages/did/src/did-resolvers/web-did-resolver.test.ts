import type { ParsedDID } from "did-resolver"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getResolver } from "./web-did-resolver"

describe("web-did-resolver", () => {
  const mockFetch = vi.fn()
  const mockDidDocument = {
    "@context": "https://www.w3.org/ns/did/v1",
    id: "did:web:example.com",
    verificationMethod: [],
  }

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
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
        { resolve: vi.fn() },
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
      await resolver.web(did, parsedDid, { resolve: vi.fn() }, {})

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
      await resolver.web(did, parsedDid, { resolve: vi.fn() }, {})

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/.well-known/did.json",
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
        { resolve: vi.fn() },
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
        { resolve: vi.fn() },
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
        { resolve: vi.fn() },
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
        { resolve: vi.fn() },
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
      const customFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDidDocument),
      })

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
        { resolve: vi.fn() },
        {},
      )

      expect(customFetch).toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
