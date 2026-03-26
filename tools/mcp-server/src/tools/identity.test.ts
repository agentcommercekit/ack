import {
  createControllerCredential,
  createDidKeyUri,
  createJwtSigner,
  generateKeypair,
  keypairToJwk,
  signCredential,
  type DidUri,
} from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg } from "../util"

describe("identity tool operations", () => {
  it("creates a controller credential with correct structure", () => {
    const credential = createControllerCredential({
      subject: "did:key:z6MkSubject" as DidUri,
      controller: "did:key:z6MkController" as DidUri,
    })

    expect(credential.type).toContain("ControllerCredential")
    expect(credential.issuer).toEqual({ id: "did:key:z6MkController" })
    expect(credential.credentialSubject.controller).toBe(
      "did:key:z6MkController",
    )
  })

  it("signs a credential and produces a valid JWT", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const signer = createJwtSigner(keypair)

    const credential = createControllerCredential({
      subject: "did:key:z6MkSubject" as DidUri,
      controller: did,
    })

    const jwt = await signCredential(credential, {
      did,
      signer,
      alg: curveToAlg(keypair.curve),
    })

    expect(jwt).toMatch(/^eyJ/)
    expect(jwt.split(".")).toHaveLength(3)
  })

  it("round-trips a keypair through JWK for signing", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const jwk = keypairToJwk(keypair)

    // Simulate what the MCP tool does: reconstruct from JWK
    const { jwkToKeypair } = await import("agentcommercekit")
    const restored = jwkToKeypair(jwk)
    const signer = createJwtSigner(restored)

    const credential = createControllerCredential({
      subject: "did:key:z6MkSubject" as DidUri,
      controller: did,
    })

    const jwt = await signCredential(credential, {
      did,
      signer,
      alg: curveToAlg(restored.curve),
    })

    expect(jwt).toMatch(/^eyJ/)
  })
})
