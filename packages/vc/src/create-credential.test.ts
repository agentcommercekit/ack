import { beforeAll, describe, expect, it, vi } from "vitest"
import { createCredential } from "./create-credential"

describe("createCredential", () => {
  const mockIssuer = "did:example:issuer"
  const mockSubject = "did:example:subject"
  const mockAttestation = { controller: "did:example:controller" }
  const date = new Date()

  beforeAll(() => {
    vi.setSystemTime(date)
  })

  it("creates a basic credential with required fields", () => {
    const credential = createCredential({
      issuer: mockIssuer,
      subject: mockSubject
    })

    expect(credential).toEqual({
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: { id: mockIssuer },
      credentialSubject: { id: mockSubject },
      issuanceDate: date.toISOString()
    })
  })

  it("includes optional attestation data", () => {
    const credential = createCredential({
      issuer: mockIssuer,
      subject: mockSubject,
      attestation: mockAttestation
    })

    expect(credential.credentialSubject).toEqual({
      id: mockSubject,
      ...mockAttestation
    })
  })

  it("handles custom credential types", () => {
    const customType = "CustomCredential"
    const credential = createCredential({
      issuer: mockIssuer,
      subject: mockSubject,
      type: customType
    })

    expect(credential.type).toEqual(["VerifiableCredential", customType])
  })

  it("handles multiple credential types", () => {
    const types = ["CustomCredential1", "CustomCredential2"]
    const credential = createCredential({
      issuer: mockIssuer,
      subject: mockSubject,
      type: types
    })

    expect(credential.type).toEqual(["VerifiableCredential", ...types])
  })

  it("uses provided issuance date", () => {
    const issuanceDate = new Date("2024-01-01")
    const credential = createCredential({
      issuer: mockIssuer,
      subject: mockSubject,
      issuanceDate
    })

    expect(credential.issuanceDate).toBe(issuanceDate.toISOString())
  })

  it("includes custom ID when provided", () => {
    const customId = "urn:uuid:12345678-1234-5678-1234-567812345678"
    const credential = createCredential({
      id: customId,
      issuer: mockIssuer,
      subject: mockSubject
    })

    expect(credential.id).toBe(customId)
  })
})
