import { describe, expect, it } from "vitest"

import { isStatusListCredential } from "./is-status-list-credential"

const baseCredential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: ["VerifiableCredential", "BitstringStatusListCredential"],
  issuer: { id: "did:web:issuer.example.com" },
  issuanceDate: "2025-01-01T00:00:00.000Z",
}

const validStatusListCredential = {
  ...baseCredential,
  credentialSubject: {
    id: "https://status.example.com/list/1",
    type: "BitstringStatusList",
    statusPurpose: "revocation",
    encodedList: "H4sIAAAAAAAA...",
  },
}

describe("isStatusListCredential", () => {
  it("returns true for a valid status list credential", () => {
    expect(isStatusListCredential(validStatusListCredential)).toBe(true)
  })

  it("returns false when credentialSubject has wrong type", () => {
    expect(
      isStatusListCredential({
        ...baseCredential,
        credentialSubject: {
          id: "https://status.example.com/list/1",
          type: "SomethingElse",
          statusPurpose: "revocation",
          encodedList: "H4sIAAAAAAAA...",
        },
      }),
    ).toBe(false)
  })

  it("returns false when credentialSubject is missing encodedList", () => {
    expect(
      isStatusListCredential({
        ...baseCredential,
        credentialSubject: {
          id: "https://status.example.com/list/1",
          type: "BitstringStatusList",
          statusPurpose: "revocation",
        },
      }),
    ).toBe(false)
  })

  it("returns false when credentialSubject is missing statusPurpose", () => {
    expect(
      isStatusListCredential({
        ...baseCredential,
        credentialSubject: {
          id: "https://status.example.com/list/1",
          type: "BitstringStatusList",
          encodedList: "H4sIAAAAAAAA...",
        },
      }),
    ).toBe(false)
  })

  it("returns false for a regular credential without status list subject", () => {
    expect(
      isStatusListCredential({
        ...baseCredential,
        credentialSubject: { id: "did:web:subject.example.com" },
      }),
    ).toBe(false)
  })

  it("rejects null", () => {
    expect(isStatusListCredential(null)).toBe(false)
  })

  it("rejects an empty object", () => {
    expect(isStatusListCredential({})).toBe(false)
  })

  it("rejects a plain string", () => {
    expect(isStatusListCredential("not a credential")).toBe(false)
  })
})
