import {
  createDidKeyUri,
  createJwt,
  createJwtSigner,
  generateKeypair,
  getDidResolver,
  keypairToJwk,
  verifyJwt,
} from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg, keypairFromJwk } from "../util"

const resolver = getDidResolver()

describe("jwt tool operations", () => {
  it("creates and verifies a JWT round-trip", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)

    const jwt = await createJwt(
      { sub: "test-subject", data: "hello" },
      { issuer: did, signer: createJwtSigner(keypair) },
      { alg: curveToAlg(keypair.curve) },
    )

    expect(jwt).toMatch(/^eyJ/)
    expect(jwt.split(".")).toHaveLength(3)

    const result = await verifyJwt(jwt, { resolver, issuer: did })
    expect(result.payload.sub).toBe("test-subject")
    expect(result.issuer).toBe(did)
  })

  it("creates a JWT via JWK round-trip", async () => {
    const keypair = await generateKeypair("Ed25519")
    const did = createDidKeyUri(keypair)
    const jwkJson = JSON.stringify(keypairToJwk(keypair))

    const restored = keypairFromJwk(jwkJson)
    const jwt = await createJwt(
      { challenge: "abc123" },
      { issuer: did, signer: createJwtSigner(restored) },
      { alg: curveToAlg(restored.curve) },
    )

    const result = await verifyJwt(jwt, { resolver })
    expect(result.payload.challenge).toBe("abc123")
  })

  it("rejects a JWT with wrong issuer", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)

    const jwt = await createJwt(
      { data: "test" },
      { issuer: did, signer: createJwtSigner(keypair) },
      { alg: curveToAlg(keypair.curve) },
    )

    await expect(
      verifyJwt(jwt, { resolver, issuer: "did:key:z6MkWrongIssuer" }),
    ).rejects.toThrow()
  })
})
