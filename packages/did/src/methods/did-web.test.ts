import { generateKeypair } from "@agentcommercekit/keys"
import {
  bytesToHexString,
  bytesToMultibase,
  publicKeyBytesToJwk,
} from "@agentcommercekit/keys/encoding"
import { describe, expect, it } from "vitest"
import { createDidWebDocument, createDidWebUri } from "./did-web"

describe("createDidWeb", () => {
  it("creates a did:web for a simple url with no path", () => {
    const url = new URL("https://example.com")
    const did = createDidWebUri(url)
    expect(did).toBe("did:web:example.com")
  })

  it("creates a did:web for a url with a path", () => {
    const url = new URL("https://example.com/path/to/resource")
    const did = createDidWebUri(url)
    expect(did).toBe("did:web:example.com:path:to:resource")
  })

  it("creates a did:web for a url with a port", () => {
    const url = new URL("https://example.com:8080/path/to/resource")
    const did = createDidWebUri(url)
    expect(did).toBe("did:web:example.com%3A8080:path:to:resource")
  })
})

describe("createDidWebDocument", () => {
  it("generates a valid DidUri and DidDocument with JWK", async () => {
    const keypair = await generateKeypair("secp256k1")
    const publicKeyJwk = publicKeyBytesToJwk(keypair.publicKey, keypair.curve)

    const { did, didDocument } = createDidWebDocument({
      publicKey: {
        encoding: "jwk",
        value: publicKeyJwk,
        curve: keypair.curve,
      },
      baseUrl: "https://example.com",
    })

    expect(did).toEqual("did:web:example.com")

    expect(didDocument).toEqual({
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/jwk/v1",
      ],
      id: "did:web:example.com",
      verificationMethod: [
        {
          id: "did:web:example.com#jwk-1",
          type: "JsonWebKey2020",
          controller: "did:web:example.com",
          publicKeyJwk,
        },
      ],
      authentication: ["did:web:example.com#jwk-1"],
      assertionMethod: ["did:web:example.com#jwk-1"],
    })
  })

  it("generates a valid DidUri and DidDocument, upgrading legacy hex to multibase", async () => {
    const keypair = await generateKeypair("secp256k1")
    const publicKeyHex = bytesToHexString(keypair.publicKey)
    const publicKeyMultibase = bytesToMultibase(keypair.publicKey)

    const { did, didDocument } = createDidWebDocument({
      publicKey: {
        encoding: "hex",
        value: publicKeyHex,
        curve: keypair.curve,
      },
      baseUrl: "https://example.com",
    })

    expect(did).toEqual("did:web:example.com")

    expect(didDocument).toEqual({
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/multikey/v1",
      ],
      id: "did:web:example.com",
      verificationMethod: [
        {
          id: "did:web:example.com#multibase-1",
          type: "Multikey",
          controller: "did:web:example.com",
          publicKeyMultibase,
        },
      ],
      authentication: ["did:web:example.com#multibase-1"],
      assertionMethod: ["did:web:example.com#multibase-1"],
    })
  })
})
