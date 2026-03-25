import { describe, expect, it } from "vitest"

import { generateRandomJti, generateRandomNonce } from "./random"

describe("generateRandomJti", () => {
  it("returns a valid UUID string", () => {
    const jti = generateRandomJti()
    expect(jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it("returns a unique value on each call", () => {
    const jti1 = generateRandomJti()
    const jti2 = generateRandomJti()
    expect(jti1).not.toBe(jti2)
  })
})

describe("generateRandomNonce", () => {
  it("returns a valid UUID string", () => {
    const nonce = generateRandomNonce()
    expect(nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it("returns a unique value on each call", () => {
    const nonce1 = generateRandomNonce()
    const nonce2 = generateRandomNonce()
    expect(nonce1).not.toBe(nonce2)
  })
})
