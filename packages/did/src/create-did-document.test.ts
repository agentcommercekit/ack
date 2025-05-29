import {
  encodePublicKeyFromKeypair,
  generateKeypair,
  keypairAlgorithms,
  publicKeyEncodings
} from "@agentcommercekit/keys"
import { beforeEach, describe, expect, test } from "vitest"
import {
  createDidDocument,
  createDidDocumentFromKeypair,
  keyConfig
} from "./create-did-document"
import type { Keypair, PublicKeyEncoding } from "@agentcommercekit/keys"

const keyTypeMap = {
  secp256k1: "EcdsaSecp256k1VerificationKey2019",
  Ed25519: "Ed25519VerificationKey2018"
} as const

const encodingMap = {
  hex: "multibase",
  jwk: "jwk",
  multibase: "multibase",
  base58: "multibase"
}

const encodingToPropertyMap = {
  hex: "publicKeyMultibase",
  jwk: "publicKeyJwk",
  multibase: "publicKeyMultibase",
  base58: "publicKeyMultibase"
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
    describe.each(publicKeyEncodings)(
      "encoding: %s",
      (encoding: PublicKeyEncoding) => {
        test(`generates matching documents with ${algorithm} and ${encoding} encoding`, () => {
          const keypair = keypairMap[algorithm]()

          const documentFromKeypair = createDidDocumentFromKeypair({
            did,
            keypair,
            encoding
          })

          const document = createDidDocument({
            did,
            publicKey: encodePublicKeyFromKeypair(encoding, keypair)
          })

          const keyId = `${did}#${encodingMap[encoding]}-1`
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
                [encodingToPropertyMap[encoding]]: expect.any(
                  encoding === "jwk" ? Object : String
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
      }
    )
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
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair),
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
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair)
    })
    const document2 = createDidDocument({
      did: did2,
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair)
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
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair)
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
