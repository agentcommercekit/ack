import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver
} from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { expect, test } from "vitest"
import { parseJwtCredential } from "./parse-jwt-credential"
import { createCredential } from "../create-credential"
import { signCredential } from "../signing/sign-credential"

test("parseJwtCredential should parse a valid credential", async () => {
  const resolver = getDidResolver()

  // Generate keypair for the issuer
  const issuerKeypair = await generateKeypair("secp256k1")
  const issuerDid = createDidWebUri("https://issuer.example.com")
  resolver.addToCache(
    issuerDid,
    createDidDocumentFromKeypair({
      did: issuerDid,
      keypair: issuerKeypair
    })
  )

  const subjectDid = createDidWebUri("https://subject.example.com")

  // Generate an unsigned attestation
  const credential = createCredential({
    id: "test-credential",
    type: "TestCredential",
    issuer: issuerDid,
    subject: subjectDid,
    attestation: {
      test: "test"
    }
  })

  const jwt = await signCredential(credential, {
    did: issuerDid,
    signer: createJwtSigner(issuerKeypair),
    alg: "ES256K"
  })

  const vc = await parseJwtCredential(jwt, resolver)

  expect(vc.issuer.id).toBe(issuerDid)
  expect(vc.credentialSubject.id).toBe(subjectDid)
  expect(vc.type).toContain("TestCredential")
})

test("verifyCredentialJwt should throw for invalid credential", async () => {
  const resolver = getDidResolver()
  const invalidCredential = "invalid.jwt.token"

  await expect(
    parseJwtCredential(invalidCredential, resolver)
  ).rejects.toThrow()
})
