import { describe, expect, it } from "vitest"
import {
  bytesToMultibase,
  getMultibaseEncoding,
  isMultibase,
  multibaseToBytes,
  type MultibaseEncoding
} from "./multibase"

describe("multibase", () => {
  // Test data: "Hello, World!" in different encodings
  const testBytes = new TextEncoder().encode("Hello, World!")
  const testMultibases = {
    base58btc: "z72k1xXWG59fYdzSNoA",
    base64url: "uSGVsbG8sIFdvcmxkIQ",
    base16: "f48656c6c6f2c20576f726c6421"
  } as const

  describe("bytesToMultibase", () => {
    it("encodes bytes to base58btc by default", () => {
      const result = bytesToMultibase(testBytes)
      expect(result).toBe(testMultibases.base58btc)
    })

    it.each(Object.entries(testMultibases))(
      "encodes bytes to %s",
      (encoding, expected) => {
        const result = bytesToMultibase(
          testBytes,
          encoding as MultibaseEncoding
        )
        expect(result).toBe(expected)
      }
    )
  })

  describe("multibaseToBytes", () => {
    it.each(Object.entries(testMultibases))(
      "decodes %s multibase string to bytes",
      (encoding, multibase) => {
        const result = multibaseToBytes(multibase)
        expect(result).toEqual(testBytes)
      }
    )

    it("throws on empty string", () => {
      expect(() => multibaseToBytes("")).toThrow("Empty multibase string")
    })

    it("throws on invalid prefix", () => {
      expect(() => multibaseToBytes("xinvalid")).toThrow(
        "Unsupported multibase prefix"
      )
    })

    it("throws on invalid base58btc", () => {
      expect(() => multibaseToBytes("zinvalid")).toThrow()
    })
  })

  describe("getMultibaseEncoding", () => {
    it.each(Object.entries(testMultibases))(
      "detects %s encoding",
      (encoding, multibase) => {
        const result = getMultibaseEncoding(multibase)
        expect(result).toBe(encoding)
      }
    )

    it("returns undefined for empty string", () => {
      expect(getMultibaseEncoding("")).toBeUndefined()
    })

    it("returns undefined for invalid prefix", () => {
      expect(getMultibaseEncoding("xinvalid")).toBeUndefined()
    })
  })

  describe("isMultibase", () => {
    it.each(Object.entries(testMultibases))(
      "validates %s multibase string",
      (encoding, multibase) => {
        expect(isMultibase(multibase)).toBe(true)
      }
    )

    it("rejects non-string values", () => {
      expect(isMultibase(null)).toBe(false)
      expect(isMultibase(undefined)).toBe(false)
      expect(isMultibase(123)).toBe(false)
      expect(isMultibase({})).toBe(false)
    })

    it("rejects empty string", () => {
      expect(isMultibase("")).toBe(false)
    })

    it("rejects string with invalid prefix", () => {
      expect(isMultibase("xinvalid")).toBe(false)
    })

    it("rejects string with invalid encoding", () => {
      expect(isMultibase("zinvalid")).toBe(false)
    })
  })

  describe("roundtrip", () => {
    it.each(Object.entries(testMultibases))(
      "roundtrips through %s encoding",
      (encoding, multibase) => {
        const bytes = multibaseToBytes(multibase)
        const result = bytesToMultibase(bytes, encoding as MultibaseEncoding)
        expect(result).toBe(multibase)
      }
    )
  })
})
