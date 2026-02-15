import {
  encodePublicKeyFromKeypair,
  generateKeypair,
  keyCurves,
  publicKeyEncodings,
  type Keypair,
  type PublicKeyEncoding,
} from "@agentcommercekit/keys"
import {
  bytesToMultibase,
  publicKeyBytesToJwk,
} from "@agentcommercekit/keys/encoding"
import { beforeEach, describe, expect, test } from "vitest"

import {
  createDidDocument,
  createDidDocumentFromKeypair,
} from "./create-did-document"

const keyTypeMap = {
  jwk: "JsonWebKey2020",
  multibase: "Multikey",
  hex: "Multikey",
  base58: "Multikey",
} as const

const encodingMap = {
  hex: "multibase",
  jwk: "jwk",
  multibase: "multibase",
  base58: "multibase",
}

const contextMap = {
  jwk: "https://w3id.org/security/jwk/v1",
  multibase: "https://w3id.org/security/multikey/v1",
  hex: "https://w3id.org/security/multikey/v1",
  base58: "https://w3id.org/security/multikey/v1",
}

describe("createDidDocument() and createDidDocumentFromKeypair()", () => {
  const did = "did:web:example.com"
  let secp256k1Keypair: Keypair
  let secp256r1Keypair: Keypair
  let ed25519Keypair: Keypair

  beforeEach(async () => {
    secp256k1Keypair = await generateKeypair("secp256k1")
    secp256r1Keypair = await generateKeypair("secp256r1")
    ed25519Keypair = await generateKeypair("Ed25519")
  })

  const keypairMap = {
    secp256k1: () => secp256k1Keypair,
    secp256r1: () => secp256r1Keypair,
    Ed25519: () => ed25519Keypair,
  } as const

  describe.each(keyCurves)("curve: %s", (curve) => {
    describe.each(publicKeyEncodings)(
      "encoding: %s",
      (encoding: PublicKeyEncoding) => {
        test(`generates matching documents with ${curve} and ${encoding} encoding`, () => {
          const keypair = keypairMap[curve]()

          const documentFromKeypair = createDidDocumentFromKeypair({
            did,
            keypair,
            encoding,
          })

          const document = createDidDocument({
            did,
            publicKey: encodePublicKeyFromKeypair(encoding, keypair),
          })

          const keyId = `${did}#${encodingMap[encoding]}-1`
          const expectedVerificationMethod =
            encoding === "jwk"
              ? {
                  id: keyId,
                  type: keyTypeMap[encoding],
                  controller: did,
                  publicKeyJwk: publicKeyBytesToJwk(keypair.publicKey, curve),
                }
              : {
                  id: keyId,
                  type: keyTypeMap[encoding],
                  controller: did,
                  publicKeyMultibase: bytesToMultibase(keypair.publicKey),
                }

          const expectedDocument = {
            "@context": ["https://www.w3.org/ns/did/v1", contextMap[encoding]],
            id: did,
            verificationMethod: [expectedVerificationMethod],
            authentication: [keyId],
            assertionMethod: [keyId],
          }

          expect(document).toEqual(expectedDocument)
          expect(documentFromKeypair).toEqual(expectedDocument)
          expect(document.verificationMethod![0]!.id).toBe(keyId)
          expect(documentFromKeypair.verificationMethod![0]!.id).toBe(keyId)
        })
      },
    )
  })

  test("includes controller when provided", () => {
    const controller = "did:web:controller.com"

    const documentFromKeypair = createDidDocumentFromKeypair({
      did,
      keypair: secp256k1Keypair,
      controller,
    })

    const document = createDidDocument({
      did,
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair),
      controller,
    })

    const expectedDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/jwk/v1",
      ],
      id: did,
      controller,
      verificationMethod: [
        {
          id: `${did}#jwk-1`,
          type: "JsonWebKey2020",
          controller: did,
          publicKeyJwk: expect.any(Object) as unknown,
        },
      ],
      authentication: [`${did}#jwk-1`],
      assertionMethod: [`${did}#jwk-1`],
    }

    expect(document).toEqual(expectedDocument)
    expect(documentFromKeypair).toEqual(expectedDocument)
  })

  test("generates unique key IDs for different DIDs", () => {
    const did1 = "did:web:example1.com"
    const did2 = "did:web:example2.com"

    const document1FromKeypair = createDidDocumentFromKeypair({
      did: did1,
      keypair: secp256k1Keypair,
    })
    const document2FromKeypair = createDidDocumentFromKeypair({
      did: did2,
      keypair: secp256k1Keypair,
    })

    const document1 = createDidDocument({
      did: did1,
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair),
    })
    const document2 = createDidDocument({
      did: did2,
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair),
    })

    expect(document1.verificationMethod![0]!.id).toBe(`${did1}#jwk-1`)
    expect(document1FromKeypair.verificationMethod![0]!.id).toBe(
      `${did1}#jwk-1`,
    )
    expect(document2.verificationMethod![0]!.id).toBe(`${did2}#jwk-1`)
    expect(document2FromKeypair.verificationMethod![0]!.id).toBe(
      `${did2}#jwk-1`,
    )
  })

  test("includes all required Did document fields", () => {
    const documentFromKeypair = createDidDocumentFromKeypair({
      did,
      keypair: secp256k1Keypair,
    })

    const document = createDidDocument({
      did,
      publicKey: encodePublicKeyFromKeypair("jwk", secp256k1Keypair),
    })

    const requiredFields = [
      "@context",
      "id",
      "verificationMethod",
      "authentication",
      "assertionMethod",
    ]
    requiredFields.forEach((field) => {
      expect(document).toHaveProperty(field)
      expect(documentFromKeypair).toHaveProperty(field)
    })
  })
})
