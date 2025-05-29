import { generateKeypair } from "@agentcommercekit/keys"
import { bytesToHexString } from "@agentcommercekit/keys/encoding"
import { describe, expect, it } from "vitest"
import { getDidResolver } from "./did-resolvers/get-did-resolver"
import { DidDocumentNotFoundError, InvalidDidControllerError } from "./errors"
import { createDidWebDocument } from "./methods/did-web"
import { resolveDid, resolveDidWithController } from "./resolve-did"
import type { DidUri } from "./did-uri"

async function generateDid(baseUrl: string, controller?: DidUri) {
  const keypair = await generateKeypair("secp256k1")

  return createDidWebDocument({
    publicKey: {
      encoding: "hex",
      value: bytesToHexString(keypair.publicKey),
      algorithm: keypair.algorithm
    },
    baseUrl,
    controller
  })
}

describe("resolveDid", () => {
  it("resolves and verifies a DID without a controller", async () => {
    const { did, didDocument } = await generateDid("https://example.com")
    const resolver = getDidResolver()
    resolver.addToCache(did, didDocument)

    const result = await resolveDid(did, resolver)
    expect(result).toEqual({
      did,
      didDocument
    })
  })

  it("resolves and verifies a DID, ignoring the controller if not required", async () => {
    const controller = await generateDid("https://controller.example.com")
    const subject = await generateDid(
      "https://subject.example.com",
      controller.did
    )
    const resolver = getDidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(subject.did, subject.didDocument)

    const result = await resolveDid(subject.did, resolver)
    expect(result).toEqual({
      did: subject.did,
      didDocument: subject.didDocument
    })
  })

  it("throws if the DID cannot be resolved", async () => {
    const did = "did:web:example.com"
    const resolver = getDidResolver()
    resolver.addResolutionResultToCache(did, {
      didResolutionMetadata: {
        error: "notFound",
        message: "not found"
      },
      didDocument: null,
      didDocumentMetadata: {}
    })

    await expect(resolveDid(did, resolver)).rejects.toThrow(
      DidDocumentNotFoundError
    )
  })
})

describe("resolveDidWithController", () => {
  it("resolves and verifies a DID including the controller", async () => {
    const controller = await generateDid("https://controller.example.com")
    const subject = await generateDid(
      "https://subject.example.com",
      controller.did
    )
    const resolver = getDidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(subject.did, subject.didDocument)

    const result = await resolveDidWithController(subject.did, resolver)

    expect(result).toEqual({
      did: subject.did,
      didDocument: subject.didDocument,
      controller: {
        did: controller.did,
        didDocument: controller.didDocument
      }
    })
  })

  it("throws if the did has no controller", async () => {
    const { did, didDocument } = await generateDid("https://example.com")
    const resolver = getDidResolver()
    resolver.addToCache(did, didDocument)

    await expect(resolveDidWithController(did, resolver)).rejects.toThrow(
      InvalidDidControllerError
    )
  })

  it("throws if the controller is the same as the subject", async () => {
    const subject = await generateDid(
      "https://subject.example.com",
      "did:web:subject.example.com"
    )
    const resolver = getDidResolver()
    resolver.addToCache(subject.did, subject.didDocument)

    await expect(
      resolveDidWithController(subject.did, resolver)
    ).rejects.toThrow(InvalidDidControllerError)
  })

  it("throws if the DID cannot be resolved", async () => {
    const did = "did:web:example.com"
    const resolver = getDidResolver()
    resolver.addResolutionResultToCache(did, {
      didResolutionMetadata: {
        error: "notFound",
        message: "not found"
      },
      didDocument: null,
      didDocumentMetadata: {}
    })

    await expect(resolveDidWithController(did, resolver)).rejects.toThrow(
      DidDocumentNotFoundError
    )
  })

  it("throws if the controller cannot be resolved", async () => {
    const controller = await generateDid("https://controller.example.com")
    const subject = await generateDid(
      "https://subject.example.com",
      controller.did
    )
    const resolver = getDidResolver()
    resolver.addToCache(subject.did, subject.didDocument)

    await expect(
      resolveDidWithController(subject.did, resolver)
    ).rejects.toThrow(DidDocumentNotFoundError)
  })
})
