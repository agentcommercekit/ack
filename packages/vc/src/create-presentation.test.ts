import { describe, expect, it } from "vitest"
import { createPresentation } from "./create-presentation"
import type { Verifiable, W3CCredential } from "./types"

describe("createPresentation", () => {
  const mockHolder = "did:example:holder"

  const mockCredential: Verifiable<W3CCredential> = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:issuer" },
    credentialSubject: { id: "did:example:subject" },
    issuanceDate: new Date().toISOString(),
    proof: {
      type: "Ed25519Signature2018",
      created: new Date().toISOString(),
      verificationMethod: "did:example:issuer#key-1",
      proofPurpose: "assertionMethod",
      jws: "mock-jws-signature"
    }
  }

  it("should create a basic presentation with required fields", () => {
    const presentation = createPresentation({
      credentials: [mockCredential],
      holder: mockHolder
    })

    expect(presentation).toEqual({
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      holder: mockHolder,
      verifiableCredential: [mockCredential]
    })
  })

  it("should handle multiple credentials", () => {
    const secondCredential = {
      ...mockCredential,
      credentialSubject: { id: "did:example:subject2" }
    }
    const presentation = createPresentation({
      credentials: [mockCredential, secondCredential],
      holder: mockHolder
    })

    expect(presentation.verifiableCredential).toHaveLength(2)
    expect(presentation.verifiableCredential).toEqual([
      mockCredential,
      secondCredential
    ])
  })

  it("should handle custom presentation types", () => {
    const customType = "CustomPresentation"
    const presentation = createPresentation({
      credentials: [mockCredential],
      holder: mockHolder,
      type: customType
    })

    expect(presentation.type).toEqual(["VerifiablePresentation", customType])
  })

  it("should handle multiple presentation types", () => {
    const types = ["CustomPresentation1", "CustomPresentation2"]
    const presentation = createPresentation({
      credentials: [mockCredential],
      holder: mockHolder,
      type: types
    })

    expect(presentation.type).toEqual(["VerifiablePresentation", ...types])
  })

  it("should use provided issuance date", () => {
    const issuanceDate = new Date("2024-01-01")
    const presentation = createPresentation({
      credentials: [mockCredential],
      holder: mockHolder,
      issuanceDate
    })

    expect(presentation.issuanceDate).toBe(issuanceDate.toISOString())
  })

  it("should use provided expiration date", () => {
    const expirationDate = new Date("2024-12-31")
    const presentation = createPresentation({
      credentials: [mockCredential],
      holder: mockHolder,
      expirationDate
    })

    expect(presentation.expirationDate).toBe(expirationDate.toISOString())
  })

  it("should include custom ID when provided", () => {
    const customId = "urn:uuid:12345678-1234-5678-1234-567812345678"
    const presentation = createPresentation({
      id: customId,
      credentials: [mockCredential],
      holder: mockHolder
    })

    expect(presentation.id).toBe(customId)
  })
})
