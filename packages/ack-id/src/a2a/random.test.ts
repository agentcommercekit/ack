import { describe, expect, it } from "vitest"

import { generateRandomJti, generateRandomNonce } from "./random"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe("generateRandomJti", () => {
  it("returns a UUID", () => {
    expect(generateRandomJti()).toMatch(uuidPattern)
  })

  it("returns unique values", () => {
    expect(generateRandomJti()).not.toBe(generateRandomJti())
  })
})

describe("generateRandomNonce", () => {
  it("returns a UUID", () => {
    expect(generateRandomNonce()).toMatch(uuidPattern)
  })

  it("returns unique values", () => {
    expect(generateRandomNonce()).not.toBe(generateRandomNonce())
  })
})
