import { describe, expect, it } from "vitest"
import { makeRevocable } from "./make-revocable"
import type { W3CCredential } from "../types"

describe("makeRevocable", () => {
  const mockCredential: W3CCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:issuer" },
    credentialSubject: { id: "did:example:subject" },
    issuanceDate: new Date().toISOString()
  }

  const mockStatusListId = "https://example.com/status/1"
  const mockStatusListUrl = "https://example.com/status/1"
  const mockStatusListIndex = 123

  it("should add revocation status to credential", () => {
    const revocableCredential = makeRevocable(mockCredential, {
      id: mockStatusListId,
      statusListIndex: mockStatusListIndex,
      statusListUrl: mockStatusListUrl
    })

    expect(revocableCredential.credentialStatus).toEqual({
      id: mockStatusListId,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: mockStatusListIndex.toString(),
      statusListCredential: mockStatusListUrl
    })
  })
})
