import { describe, expect, it } from "vitest"

import { isDidUri } from "./did-uri"

describe("isDidUri", () => {
  it("returns true for a valid DID URI", () => {
    expect(isDidUri("did:web:example.com")).toBe(true)
  })

  it("returns false for an invalid DID URI", () => {
    expect(isDidUri("invalid-did-uri")).toBe(false)
  })
})
