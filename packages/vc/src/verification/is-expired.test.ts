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

  it("treats an unparseable expiration date as expired (fail closed)", () => {
    const credential = buildCredential("invalid-date")

    expect(isExpired(credential)).toBe(true)
  })

  it("treats a present but empty-string expiration date as expired (fail closed)", () => {
    // An empty string is present (not `undefined`) but unparseable
    // (`new Date("")` -> `NaN`). It must not be conflated with an absent
    // `expirationDate` via a falsy check, or it silently fails open.
    const credential = buildCredential("")

    expect(isExpired(credential)).toBe(true)
  })

  it("treats a non-string expiration date as expired (fail closed)", () => {
    // `parseJwtCredential` does not validate that `expirationDate` is a
    // string, so a malformed or untrusted credential can carry a number
    // (or another non-string JSON value) here at runtime, bypassing the
    // type system. `new Date(epochMs)` parses to a valid date, so without
    // an explicit typeof check, a numeric value corresponding to a *future*
    // date would incorrectly pass as "not expired" via the normal
    // date-comparison path below - this must be rejected before it gets
    // that far, regardless of which date it happens to encode.
    const tenYearsFromNowMs = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- models an untyped/malformed JWT payload
    const credential = {
      ...buildCredential(),
      expirationDate: tenYearsFromNowMs,
    } as unknown as W3CCredential

    expect(isExpired(credential)).toBe(true)
  })
})
