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

  it("returns true when expiration date cannot be parsed", () => {
    const credential = buildCredential("invalid-date")

    expect(isExpired(credential)).toBe(true)
  })

  it("returns true for empty-string expiration dates", () => {
    const credential = buildCredential("")

    expect(isExpired(credential)).toBe(true)
  })

  it("returns true for non-ISO numeric strings that Date cannot parse as expiry", () => {
    const credential = buildCredential("not-a-real-timestamp")

    expect(isExpired(credential)).toBe(true)
  })

  it("returns true for ISO overflow calendar dates that Date would normalize", () => {
    // JS Date turns 2099-02-30 into a valid March date; fail closed instead.
    const credential = buildCredential("2099-02-30T00:00:00.000Z")

    expect(Number.isNaN(new Date("2099-02-30T00:00:00.000Z").getTime())).toBe(
      false
    )
    expect(isExpired(credential)).toBe(true)
  })

  it("returns false for a future timestamp whose offset crosses a UTC day boundary", () => {
    // 2099-01-01T00:00:00+14:00 is 2098-12-31 in UTC; calendar fields are still valid.
    const credential = buildCredential("2099-01-01T00:00:00+14:00")

    expect(isExpired(credential)).toBe(false)
  })
})
