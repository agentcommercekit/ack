import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver
} from "@agentcommercekit/did"
import { createJwtSigner, verifyJwt } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { expect, test } from "vitest"
import { createPresentation } from "../create-presentation"
import { signPresentation } from "./sign-presentation"
import type { Verifiable, W3CCredential } from "../types"

test("signPresentation creates a valid JWT and verifiable presentation", async () => {
  const resolver = getDidResolver()
  const holderKeypair = await generateKeypair("secp256k1")
  const holderDid = createDidWebUri("https://holder.example.com")

  resolver.addToCache(
    holderDid,
    createDidDocumentFromKeypair({
      did: holderDid,
      keypair: holderKeypair
    })
  )

  // Create a mock credential for the presentation
  const mockCredential: Verifiable<W3CCredential> = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:issuer" },
    credentialSubject: { id: "did:example:subject" },
    issuanceDate: new Date().toISOString(),
    proof: {
      type: "Ed25519Signature2018",
      created: new Date().toISOString(),
      verificationMethod: "did:example:issuer#key-1",
      proofPurpose: "assertionMethod",
      jws: "mock-jws-signature"
    }
  }

  // Generate an unsigned presentation
  const presentation = createPresentation({
    credentials: [mockCredential],
    holder: holderDid,
    id: "test-presentation",
    type: "TestPresentation"
  })

  // Sign the presentation
  const { jwt, verifiablePresentation } = await signPresentation(presentation, {
    did: holderDid,
    signer: createJwtSigner(holderKeypair),
    alg: "ES256K",
    resolver
  })

  // Verify the JWT using did-jwt verifier
  const result = await verifyJwt(jwt, {
    resolver
  })

  expect(result.payload.iss).toBe(holderDid)
  expect(verifiablePresentation).toMatchObject(result.payload.vp)
})
