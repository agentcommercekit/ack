import { describe, expect, it, vi } from "vitest"
import { isExpired } from "./is-expired"
import type { Verifiable, W3CCredential } from "../types"

describe("isExpired", () => {
  it("returns false when credential has no expiration date", () => {
    const credential = {} as Verifiable<W3CCredential>
    expect(isExpired(credential)).toBe(false)
  })

  it("returns true when credential is expired", () => {
    const pastDate = new Date()
    pastDate.setFullYear(pastDate.getFullYear() - 1)

    const credential = {
      expirationDate: pastDate.toISOString()
    } as Verifiable<W3CCredential>

    expect(isExpired(credential)).toBe(true)
  })

  it("returns false when credential is not expired", () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const credential = {
      expirationDate: futureDate.toISOString()
    } as Verifiable<W3CCredential>

    expect(isExpired(credential)).toBe(false)
  })

  it("handles expiration date exactly at current time", () => {
    const now = new Date()
    const credential = {
      expirationDate: now.toISOString()
    } as Verifiable<W3CCredential>

    vi.setSystemTime(now)

    expect(isExpired(credential)).toBe(false)
  })

  it("handles invalid date strings gracefully", () => {
    const credential = {
      expirationDate: "invalid-date"
    } as Verifiable<W3CCredential>

    expect(isExpired(credential)).toBe(false)
  })
})
