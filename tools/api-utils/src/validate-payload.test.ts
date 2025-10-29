import {
  createDidWebDocumentFromKeypair,
  DidResolver,
  getDidResolver,
  type createDidWebDocument,
} from "@agentcommercekit/did"
import {
  createJwt,
  createJwtSigner,
  type JwtSigner,
  type JwtString,
} from "@agentcommercekit/jwt"
import { generateKeypair, type Keypair } from "@agentcommercekit/keys"
import * as v from "valibot"
import { beforeEach, describe, expect, it } from "vitest"
import { validatePayload } from "./validate-payload"

const testBodySchema = v.object({
  test: v.string(),
})

describe("validatePayload", () => {
  let keypair: Keypair
  let did: ReturnType<typeof createDidWebDocument>
  let signer: JwtSigner

  const payload: v.InferOutput<typeof testBodySchema> = {
    test: "testValue",
  }

  beforeEach(async () => {
    keypair = await generateKeypair("secp256k1")
    did = createDidWebDocumentFromKeypair({
      keypair,
      baseUrl: "https://test.example.com",
    })
    signer = createJwtSigner(keypair)
  })

  it("should successfully validate a valid JWT", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(did.did, did.didDocument)

    const jwt = await createJwt(payload, {
      issuer: did.did,
      signer,
    })

    // Validate the JWT
    const { parsed, body } = await validatePayload(
      jwt,
      testBodySchema,
      resolver,
    )

    expect(parsed.issuer).toBe(did.did)
    expect(body).toEqual(payload)
  })

  it("should throw unauthorized error for invalid JWT", async () => {
    const invalidJwt = "invalid-jwt" as JwtString
    const resolver = new DidResolver()

    await expect(
      validatePayload(invalidJwt, testBodySchema, resolver),
    ).rejects.toThrow("Invalid payload")
  })

  it("should throw an error if did does not resolve", async () => {
    const resolver = new DidResolver()

    const jwt = await createJwt(payload, {
      issuer: did.did,
      signer,
    })

    await expect(
      validatePayload(jwt, testBodySchema, resolver),
    ).rejects.toThrow("Invalid payload")
  })

  it("should throw unauthorized error for JWT with invalid signature", async () => {
    const resolver = getDidResolver()
    resolver.addToCache(did.did, did.didDocument)

    // Create a JWT
    const payload = {
      sub: "did:example:123",
      aud: "did:example:456",
    }

    const differentKeypair = await generateKeypair("secp256k1")
    const differentSigner = createJwtSigner(differentKeypair)

    const jwt = await createJwt(payload, {
      issuer: did.did,
      signer: differentSigner,
    })

    await expect(
      validatePayload(jwt, testBodySchema, resolver),
    ).rejects.toThrow("Invalid payload")
  })

  it("should throw an error if the payload is not valid", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(did.did, did.didDocument)

    const payload = {
      invalid: "invalid",
    }

    const jwt = await createJwt(payload, {
      issuer: did.did,
      signer,
    })

    await expect(
      validatePayload(jwt, testBodySchema, resolver),
    ).rejects.toBeInstanceOf(v.ValiError)
  })
})
