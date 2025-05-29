import {
  formatPublicKey,
  generateKeypair,
  keypairAlgorithms,
  publicKeyFormats
} from "@agentcommercekit/keys"
import { beforeEach, describe, expect, test } from "vitest"
import {
  createDidDocument,
  createDidDocumentFromKeypair,
  keyConfig
} from "./create-did-document"
import type { DidDocument } from "./did-document"
import type { Keypair, PublicKeyFormat } from "@agentcommercekit/keys"

const keyTypeMap = {
  secp256k1: "EcdsaSecp256k1VerificationKey2019",
  Ed25519: "Ed25519VerificationKey2018"
} as const

const formatMap = {
  hex: "multibase",
  jwk: "jwk",
  multibase: "multibase",
  base58: "multibase",
  base64: "multibase"
}

const formatToPropertyMap = {
  hex: "publicKeyMultibase",
  jwk: "publicKeyJwk",
  multibase: "publicKeyMultibase",
  base58: "publicKeyMultibase",
  base64: "publicKeyMultibase"
} as const

describe("createDidDocument() and createDidDocumentFromKeypair()", () => {
  const did = "did:web:example.com"
  let secp256k1Keypair: Keypair
  let ed25519Keypair: Keypair

  beforeEach(async () => {
    secp256k1Keypair = await generateKeypair("secp256k1")
    ed25519Keypair = await generateKeypair("Ed25519")
  })

  const keypairMap = {
    secp256k1: () => secp256k1Keypair,
    Ed25519: () => ed25519Keypair
  } as const

  describe.each(keypairAlgorithms)("algorithm: %s", (algorithm) => {
    describe.each(publicKeyFormats)("format: %s", (format: PublicKeyFormat) => {
      test(`generates matching documents with ${algorithm} and ${format} format`, () => {
        const keypair = keypairMap[algorithm]()

        const documentFromKeypair = createDidDocumentFromKeypair({
          did,
          keypair,
          format
        })

        let document: DidDocument
        switch (format) {
          case "hex":
            document = createDidDocument({
              did,
              publicKey: {
                format: "hex",
                algorithm,
                value: formatPublicKey(keypair, "hex")
              }
            })
            break
          case "jwk":
            document = createDidDocument({
              did,
              publicKey: {
                format: "jwk",
                algorithm,
                value: formatPublicKey(keypair, "jwk")
              }
            })
            break
          case "multibase":
            document = createDidDocument({
              did,
              publicKey: {
                format: "multibase",
                algorithm,
                value: formatPublicKey(keypair, "multibase")
              }
            })
            break
          case "base58":
            document = createDidDocument({
              did,
              publicKey: {
                format: "base58",
                algorithm,
                value: formatPublicKey(keypair, "base58")
              }
            })
            break
          case "base64":
            document = createDidDocument({
              did,
              publicKey: {
                format: "base64",
                algorithm,
                value: formatPublicKey(keypair, "base64")
              }
            })
            break
        }

        const keyId = `${did}#${formatMap[format]}-1`
        const expectedDocument = {
          "@context": [
            "https://www.w3.org/ns/did/v1",
            ...keyConfig[algorithm].context
          ],
          id: did,
          verificationMethod: [
            {
              id: keyId,
              type: keyTypeMap[algorithm],
              controller: did,
              [formatToPropertyMap[format]]: expect.any(
                format === "jwk" ? Object : String
              ) as unknown
            }
          ],
          authentication: [keyId],
          assertionMethod: [keyId]
        }

        expect(document).toEqual(expectedDocument)
        expect(documentFromKeypair).toEqual(expectedDocument)
        expect(document.verificationMethod![0]!.id).toBe(keyId)
        expect(documentFromKeypair.verificationMethod![0]!.id).toBe(keyId)
      })
    })
  })

  test("includes controller when provided", () => {
    const controller = "did:web:controller.com"

    const documentFromKeypair = createDidDocumentFromKeypair({
      did,
      keypair: secp256k1Keypair,
      controller
    })

    const document = createDidDocument({
      did,
      publicKey: {
        format: "jwk",
        algorithm: "secp256k1",
        value: formatPublicKey(secp256k1Keypair, "jwk")
      },
      controller
    })

    const expectedDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security#EcdsaSecp256k1VerificationKey2019"
      ],
      id: did,
      controller,
      verificationMethod: [
        {
          id: `${did}#jwk-1`,
          type: "EcdsaSecp256k1VerificationKey2019",
          controller: did,
          publicKeyJwk: expect.any(Object) as unknown
        }
      ],
      authentication: [`${did}#jwk-1`],
      assertionMethod: [`${did}#jwk-1`]
    }

    expect(document).toEqual(expectedDocument)
    expect(documentFromKeypair).toEqual(expectedDocument)
  })

  test("generates unique key IDs for different DIDs", () => {
    const did1 = "did:web:example1.com"
    const did2 = "did:web:example2.com"

    const document1FromKeypair = createDidDocumentFromKeypair({
      did: did1,
      keypair: secp256k1Keypair
    })
    const document2FromKeypair = createDidDocumentFromKeypair({
      did: did2,
      keypair: secp256k1Keypair
    })

    const document1 = createDidDocument({
      did: did1,
      publicKey: {
        format: "jwk",
        algorithm: "secp256k1",
        value: formatPublicKey(secp256k1Keypair, "jwk")
      }
    })
    const document2 = createDidDocument({
      did: did2,
      publicKey: {
        format: "jwk",
        algorithm: "secp256k1",
        value: formatPublicKey(secp256k1Keypair, "jwk")
      }
    })

    expect(document1.verificationMethod![0]!.id).toBe(`${did1}#jwk-1`)
    expect(document1FromKeypair.verificationMethod![0]!.id).toBe(
      `${did1}#jwk-1`
    )
    expect(document2.verificationMethod![0]!.id).toBe(`${did2}#jwk-1`)
    expect(document2FromKeypair.verificationMethod![0]!.id).toBe(
      `${did2}#jwk-1`
    )
  })

  test("includes all required Did document fields", () => {
    const documentFromKeypair = createDidDocumentFromKeypair({
      did,
      keypair: secp256k1Keypair
    })

    const document = createDidDocument({
      did,
      publicKey: {
        format: "jwk",
        algorithm: "secp256k1",
        value: formatPublicKey(secp256k1Keypair, "jwk")
      }
    })

    const requiredFields = [
      "@context",
      "id",
      "verificationMethod",
      "authentication",
      "assertionMethod"
    ]
    requiredFields.forEach((field) => {
      expect(document).toHaveProperty(field)
      expect(documentFromKeypair).toHaveProperty(field)
    })
  })
})
