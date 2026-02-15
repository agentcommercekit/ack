import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
  type Resolvable,
} from "@agentcommercekit/did"
import { generateKeypair } from "@agentcommercekit/keys"
import {
  InvalidControllerClaimError,
  InvalidCredentialSubjectError,
} from "@agentcommercekit/vc"
import { beforeEach, describe, expect, it } from "vitest"

import { getControllerClaimVerifier } from "./controller-claim-verifier"

async function setup() {
  const resolver = getDidResolver()

  // Generate keypair for the controller
  const controllerKeypair = await generateKeypair("secp256k1")
  const controllerDid = createDidWebUri("https://controller.example.com")
  resolver.addToCache(
    controllerDid,
    createDidDocumentFromKeypair({
      did: controllerDid,
      keypair: controllerKeypair,
    }),
  )

  // Generate keypair for the agent
  const agentKeypair = await generateKeypair("secp256k1")
  const agentDid = createDidWebUri("https://agent.example.com")
  resolver.addToCache(
    agentDid,
    createDidDocumentFromKeypair({
      did: agentDid,
      keypair: agentKeypair,
      controller: controllerDid,
    }),
  )

  return { resolver, controllerDid, agentDid }
}

describe("getControllerClaimVerifier", () => {
  let resolver: Resolvable
  let controllerDid: string
  let agentDid: string

  beforeEach(async () => {
    const setupResult = await setup()
    resolver = setupResult.resolver
    controllerDid = setupResult.controllerDid
    agentDid = setupResult.agentDid
  })

  it("accepts ControllerCredential type", () => {
    const verifier = getControllerClaimVerifier()
    expect(verifier.accepts(["ControllerCredential"])).toBe(true)
    expect(verifier.accepts(["OtherCredentialType"])).toBe(false)
  })

  it("does not accept other credential types", () => {
    const verifier = getControllerClaimVerifier()
    expect(verifier.accepts(["OtherCredentialType"])).toBe(false)
  })

  it("throws for invalid credential subject structure", async () => {
    const verifier = getControllerClaimVerifier()

    const invalidSubject = {
      id: agentDid,
      someOtherField: "value",
    }

    await expect(verifier.verify(invalidSubject, resolver)).rejects.toThrow(
      InvalidCredentialSubjectError,
    )
  })

  it("throws for unresolved agent DID", async () => {
    const verifier = getControllerClaimVerifier()

    const credential = {
      id: "did:example:non-existent",
      controller: "did:example:controller",
    }

    await expect(verifier.verify(credential, resolver)).rejects.toThrow()
  })

  it("throws when controller does not match", async () => {
    const verifier = getControllerClaimVerifier()

    const credential = {
      id: agentDid,
      controller: "did:example:wrong-controller",
    }

    await expect(verifier.verify(credential, resolver)).rejects.toThrow(
      InvalidControllerClaimError,
    )
  })

  it("verifies valid controller claim", async () => {
    const verifier = getControllerClaimVerifier()

    const credential = {
      id: agentDid,
      controller: controllerDid,
    }

    await expect(verifier.verify(credential, resolver)).resolves.not.toThrow()
  })
})
