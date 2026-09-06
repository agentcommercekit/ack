import { describe, expect, it } from "vitest"

import type { W3CCredential } from "../types"
import { isVerifiable } from "./is-verifiable"

// A minimal valid W3C credential, without a proof
const baseCredential: W3CCredential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: ["VerifiableCredential"],
  issuer: { id: "did:web:issuer.example.com" },
  issuanceDate: "2025-01-01T00:00:00.000Z",
  credentialSubject: { id: "did:web:subject.example.com" },
}

describe("isVerifiable", () => {
  it("returns true when the credential carries a typed proof", () => {
    const credential = { ...baseCredential, proof: { type: "JwtProof2020" } }
    expect(isVerifiable(credential)).toBe(true)
  })

  it("returns true when the proof carries additional fields", () => {
    const credential = {
      ...baseCredential,
      proof: { type: "JwtProof2020", jwt: "header.payload.signature" },
    }
    expect(isVerifiable(credential)).toBe(true)
  })

  it("returns false when no proof is present", () => {
    expect(isVerifiable(baseCredential)).toBe(false)
  })

  it("returns false when proof is null", () => {
    const credential = { ...baseCredential, proof: null }
    expect(isVerifiable(credential)).toBe(false)
  })

  it("returns false when proof is present but undefined", () => {
    const credential = { ...baseCredential, proof: undefined }
    expect(isVerifiable(credential)).toBe(false)
  })

  it("returns false when proof is not an object", () => {
    const credential = { ...baseCredential, proof: "JwtProof2020" }
    expect(isVerifiable(credential)).toBe(false)
  })

  it("returns false when proof is an empty object", () => {
    const credential = { ...baseCredential, proof: {} }
    expect(isVerifiable(credential)).toBe(false)
  })

  it("returns false when proof has no type", () => {
    const credential = {
      ...baseCredential,
      proof: { jwt: "header.payload.signature" },
    }
    expect(isVerifiable(credential)).toBe(false)
  })
})
