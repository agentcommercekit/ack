import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { verifyCredential } from "did-jwt-vc"
import { expect, it, vi } from "vitest"

import { createCredential } from "../create-credential"
import { signCredential } from "../signing/sign-credential"
import { InvalidCredentialError } from "./errors"
import { parseJwtCredential } from "./parse-jwt-credential"

vi.mock("did-jwt-vc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("did-jwt-vc")>()
  // Delegate to the real implementation by default; individual tests can
  // override `verifyCredential` to exercise malformed decoder output.
  return {
    ...actual,
    verifyCredential: vi.fn<typeof actual.verifyCredential>(
      actual.verifyCredential,
    ),
  }
})

/**
 * Replace the next `verifyCredential` call with one that returns the given
 * decoded credential shape. The real return type promises a valid
 * `Verifiable<W3CCredential>`, but these tests deliberately exercise malformed
 * decoder output, so the override is typed to accept any decoded value.
 */
function mockDecodedCredential(verifiableCredential: unknown): void {
  const mocked = vi.mocked(verifyCredential)
  mocked.mockImplementationOnce(() =>
    Promise.resolve(
      Object.assign(Object.create(null), { verifiableCredential }),
    ),
  )
}

it("parseJwtCredential should parse a valid credential", async () => {
  const resolver = getDidResolver()

  // Generate keypair for the issuer
  const issuerKeypair = await generateKeypair("secp256k1")
  const issuerDid = createDidWebUri("https://issuer.example.com")
  resolver.addToCache(
    issuerDid,
    createDidDocumentFromKeypair({
      did: issuerDid,
      keypair: issuerKeypair,
    }),
  )

  const subjectDid = createDidWebUri("https://subject.example.com")

  // Generate an unsigned attestation
  const credential = createCredential({
    id: "test-credential",
    type: "TestCredential",
    issuer: issuerDid,
    subject: subjectDid,
    attestation: {
      test: "test",
    },
  })

  const jwt = await signCredential(credential, {
    did: issuerDid,
    signer: createJwtSigner(issuerKeypair),
    alg: "ES256K",
  })

  const vc = await parseJwtCredential(jwt, resolver)

  expect(vc.issuer.id).toBe(issuerDid)
  expect(vc.credentialSubject.id).toBe(subjectDid)
  expect(vc.type).toContain("TestCredential")
})

it("verifyCredentialJwt should throw for invalid credential", async () => {
  const resolver = getDidResolver()
  const invalidCredential = "invalid.jwt.token"

  await expect(parseJwtCredential(invalidCredential, resolver)).rejects.toThrow(
    /invalid_jwt/,
  )
})

it("throws when the verified JWT does not decode to a valid credential", async () => {
  const resolver = getDidResolver()

  // Simulate did-jwt-vc returning a shape that diverges from W3CCredential
  mockDecodedCredential({ not: "a credential" })

  await expect(parseJwtCredential("a.b.c", resolver)).rejects.toThrow(
    InvalidCredentialError,
  )
})

it("throws when the decoded credential has a non-normalized string issuer", async () => {
  const resolver = getDidResolver()

  // Downstream reads `issuer.id`, so a top-level string issuer must be rejected
  mockDecodedCredential({
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: "did:example:issuer",
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:example:subject" },
    proof: { type: "JwtProof2020", jwt: "a.b.c" },
  })

  await expect(parseJwtCredential("a.b.c", resolver)).rejects.toThrow(
    InvalidCredentialError,
  )
})

it("returns the decoded credential for a JSON-LD object context entry", async () => {
  const resolver = getDidResolver()

  // A valid VC with an object `@context` entry must NOT be false-rejected
  const verifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      { ex: "https://example.com/vocab#" },
    ],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:issuer" },
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:example:subject" },
    proof: { type: "JwtProof2020", jwt: "a.b.c" },
  }
  mockDecodedCredential(verifiableCredential)

  await expect(parseJwtCredential("a.b.c", resolver)).resolves.toBe(
    verifiableCredential,
  )
})
