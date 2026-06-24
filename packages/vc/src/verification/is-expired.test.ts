import { describe, expect, it, vi } from "vitest"

import type { W3CCredential } from "../types"
import { isExpired } from "./is-expired"

function buildCredential(expirationDate?: string): W3CCredential {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:123" },
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:example:subject" },
    expirationDate,
  }
}

describe("isExpired", () => {
  it("returns false when credential has no expiration date", () => {
    const credential = buildCredential()
    expect(isExpired(credential)).toBe(false)
  })

  it("returns true when credential is expired", () => {
    const pastDate = new Date()
    pastDate.setFullYear(pastDate.getFullYear() - 1)

    const credential = buildCredential(pastDate.toISOString())

    expect(isExpired(credential)).toBe(true)
  })

  it("returns false when credential is not expired", () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const credential = buildCredential(futureDate.toISOString())

    expect(isExpired(credential)).toBe(false)
  })

  it("handles expiration date exactly at current time", () => {
    const now = new Date()
    const credential = buildCredential(now.toISOString())

    vi.setSystemTime(now)

    expect(isExpired(credential)).toBe(false)
  })

  it("handles invalid date strings gracefully", () => {
    const credential = buildCredential("invalid-date")

    expect(isExpired(credential)).toBe(false)
  })
})
