import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { createJwtSigner, verifyJwt } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { expect, test } from "vitest"

import type { JwtCredentialPayload } from "../types"

import { createCredential } from "../create-credential"
import { signCredential } from "./sign-credential"

test("signCredential creates a valid JWT and verifiable credential", async () => {
  const resolver = getDidResolver()
  // Generate `Keypair`s for both the subject and controller
  const issuerKeypair = await generateKeypair("secp256k1")
  const issuerDid = createDidWebUri("https://issuer.example.com")
  // Add controller Did document to resolver for verification
  resolver.addToCache(
    issuerDid,
    createDidDocumentFromKeypair({
      did: issuerDid,
      keypair: issuerKeypair,
    }),
  )

  const subjectDid = createDidWebUri("https://subject.example.com")

  // Generate an unsigned credential
  // Generate an unsigned credential
  const credential = createCredential({
    id: "test-credential",
    type: "TestCredential",
    issuer: issuerDid,
    subject: subjectDid,
    attestation: {
      test: "test",
    },
  })

  // Sign the credential
  const jwt = await signCredential(credential, {
    did: issuerDid,
    signer: createJwtSigner(issuerKeypair),
    alg: "ES256K",
  })

  // Verify the JWT using did-jwt verifier
  const result = await verifyJwt(jwt, {
    resolver,
  })

  // Verify the basic structure of the decoded payload
  expect(result.payload.iss).toBe(issuerDid)
  expect(result.payload.sub).toBe(subjectDid)

  const payload = result.payload as JwtCredentialPayload

  // Verify VC-specific payload elements
  expect(credential).toMatchObject(payload.vc)
})
