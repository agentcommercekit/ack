import { describe, expect, it } from "vitest"

import { isCredential } from "./is-credential"

// A minimal valid W3C credential
const validCredential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: ["VerifiableCredential"],
  issuer: { id: "did:web:issuer.example.com" },
  issuanceDate: "2025-01-01T00:00:00.000Z",
  credentialSubject: { id: "did:web:subject.example.com" },
}

describe("isCredential", () => {
  it("returns true for a valid credential", () => {
    expect(isCredential(validCredential)).toBe(true)
  })

  it("accepts issuer as a plain string", () => {
    expect(
      isCredential({
        ...validCredential,
        issuer: "did:web:issuer.example.com",
      }),
    ).toBe(true)
  })

  it("accepts credentials with optional fields", () => {
    expect(
      isCredential({
        ...validCredential,
        id: "urn:uuid:123",
        expirationDate: "2030-01-01T00:00:00.000Z",
        credentialStatus: {
          id: "https://status.example.com/1",
          type: "BitstringStatusListEntry",
        },
        proof: { type: "JwtProof2020" },
      }),
    ).toBe(true)
  })

  it("rejects null", () => {
    expect(isCredential(null)).toBe(false)
  })

  it("rejects undefined", () => {
    expect(isCredential(undefined)).toBe(false)
  })

  it("rejects a plain string", () => {
    expect(isCredential("not a credential")).toBe(false)
  })

  it("rejects an empty object", () => {
    expect(isCredential({})).toBe(false)
  })

  it("rejects when @context is missing", () => {
    const { "@context": _, ...noContext } = validCredential
    expect(isCredential(noContext)).toBe(false)
  })

  it("rejects when type is missing", () => {
    const { type: _, ...noType } = validCredential
    expect(isCredential(noType)).toBe(false)
  })

  it("rejects when issuer is missing", () => {
    const { issuer: _, ...noIssuer } = validCredential
    expect(isCredential(noIssuer)).toBe(false)
  })

  it("rejects when issuanceDate is missing", () => {
    const { issuanceDate: _, ...noDate } = validCredential
    expect(isCredential(noDate)).toBe(false)
  })

  it("rejects when credentialSubject is missing", () => {
    const { credentialSubject: _, ...noSubject } = validCredential
    expect(isCredential(noSubject)).toBe(false)
  })
})
