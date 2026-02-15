import { createDidWebUri } from "@agentcommercekit/did"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { createControllerCredential } from "./controller-credential"

describe("createControllerCredential", () => {
  const date = new Date()

  beforeAll(() => {
    vi.setSystemTime(date)
  })

  it("it creates a valid credential", () => {
    const controllerDid = createDidWebUri("https://controller.example.com")
    const subjectDid = createDidWebUri("https://subject.example.com")
    const issuerDid = createDidWebUri("https://issuer.example.com")

    const credential = createControllerCredential({
      subject: subjectDid,
      controller: controllerDid,
      issuer: issuerDid,
    })

    // Check basic structure
    expect(credential).toEqual({
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: undefined,
      type: ["VerifiableCredential", "ControllerCredential"],
      issuer: { id: issuerDid },
      credentialSubject: {
        id: subjectDid,
        controller: controllerDid,
      },
      issuanceDate: new Date().toISOString(),
    })

    // Verify issuanceDate is a valid ISO date string
    expect(() => new Date(credential.issuanceDate)).not.toThrow()
  })

  it("defaults to controller as issuer", () => {
    const controllerDid = createDidWebUri("https://controller.example.com")
    const subjectDid = createDidWebUri("https://subject.example.com")

    const credential = createControllerCredential({
      subject: subjectDid,
      controller: controllerDid,
    })

    expect(credential.issuer).toEqual({ id: controllerDid })
  })
})
