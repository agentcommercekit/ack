import type { DatabaseCredential } from "@/db/schema"
import {
  createCredential,
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  DidResolver,
  generateKeypair,
  isJwtString
} from "agentcommercekit"
import { describe, expect, it } from "vitest"
import type { Issuer } from "../types"
import { buildSignedCredential } from "./build-signed-credential"

describe("buildSignedCredential", async () => {
  const baseUrl = "https://test.example.com"
  const path = "/credentials"

  const keypair = await generateKeypair("secp256k1")

  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl
  })

  const issuer: Issuer = {
    did,
    didDocument,
    signer: createJwtSigner(keypair),
    alg: "ES256K"
  }

  const credential: DatabaseCredential = {
    id: 1,
    credentialType: "TestCredential",
    issuedAt: new Date(),
    revokedAt: null,
    baseCredential: createCredential({
      id: "test-credential-id",
      type: "TestCredential",
      issuer: issuer.did,
      subject: "did:example:123",
      attestation: {
        test: "data"
      }
    })
  }

  it("should set the id on the credential", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)

    const { credential: signedCredential } = await buildSignedCredential({
      baseUrl,
      path,
      issuer,
      credential,
      resolver
    })

    expect(signedCredential.id).toBe(`${baseUrl}/credentials/${credential.id}`)
  })

  it("makes the credential revocable", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)

    const { credential: signedCredential } = await buildSignedCredential({
      baseUrl,
      path,
      issuer,
      credential,
      resolver
    })

    expect(signedCredential.credentialStatus).toBeDefined()
  })

  it("signs the credential", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)

    const { credential: signedCredential } = await buildSignedCredential({
      baseUrl,
      path,
      issuer,
      credential,
      resolver
    })

    expect(signedCredential.proof).toBeDefined()
    expect(signedCredential.proof.type).toBe("JwtProof2020")
    expect(isJwtString(signedCredential.proof.jwt as string)).toBeTruthy()
  })
})
