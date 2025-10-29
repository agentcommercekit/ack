import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { createJwtSigner, verifyJwt } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { describe, expect, it } from "vitest"
import { createPresentation } from "../create-presentation"
import type { Verifiable, W3CCredential } from "../types"
import { signPresentation } from "./sign-presentation"
import type { Signer } from "./types"

const resolver = getDidResolver()
const holderKeypair = await generateKeypair("secp256k1")
const holderDid = createDidWebUri("https://holder.example.com")

resolver.addToCache(
  holderDid,
  createDidDocumentFromKeypair({
    did: holderDid,
    keypair: holderKeypair,
  }),
)

const signer: Signer = {
  did: holderDid,
  signer: createJwtSigner(holderKeypair),
  alg: "ES256K",
}

// Create a mock credential for the presentation
const mockCredential: Verifiable<W3CCredential> = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: ["VerifiableCredential"],
  issuer: { id: "did:example:issuer" },
  credentialSubject: { id: "did:example:subject" },
  issuanceDate: new Date().toISOString(),
  proof: {
    type: "Ed25519Signature2018",
  },
}

// Generate an unsigned presentation
const presentation = createPresentation({
  credentials: [mockCredential],
  holder: holderDid,
  id: "test-presentation",
  type: "TestPresentation",
})

describe("signPresentation", () => {
  it("creates a valid JWT and verifiable presentation", async () => {
    // Sign the presentation
    const jwt = await signPresentation(presentation, signer)

    // Verify the JWT using did-jwt verifier
    const result = await verifyJwt(jwt, {
      resolver,
    })

    expect(result.payload.iss).toBe(holderDid)
    expect(result.payload.nonce).toBeUndefined()
    expect(result.payload.aud).toBeUndefined()
    expect(presentation).toMatchObject(result.payload.vp)
  })

  it("includes a challenge and domain", async () => {
    const jwt = await signPresentation(presentation, signer, {
      challenge: "test-challenge",
      domain: "https://example.com",
    })

    const result = await verifyJwt(jwt, {
      resolver,
      policies: {
        aud: false,
      },
    })

    expect(result.payload.nonce).toBe("test-challenge")
    expect(result.payload.aud).toEqual(["https://example.com"])
  })
})
