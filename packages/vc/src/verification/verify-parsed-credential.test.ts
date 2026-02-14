import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { generateKeypair } from "@agentcommercekit/keys"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCredential } from "../create-credential"
import type { Verifiable, W3CCredential } from "../types"
import {
  CredentialExpiredError,
  CredentialRevokedError,
  InvalidProofError,
  UnsupportedCredentialTypeError,
  UntrustedIssuerError,
} from "./errors"
import { isExpired } from "./is-expired"
import { isRevoked } from "./is-revoked"
import { verifyParsedCredential } from "./verify-parsed-credential"
import { verifyProof } from "./verify-proof"

vi.mock("./is-expired", () => ({
  isExpired: vi.fn(),
}))

vi.mock("./is-revoked", () => ({
  isRevoked: vi.fn(),
}))

vi.mock("./verify-proof", () => ({
  verifyProof: vi.fn(),
}))

async function setup() {
  const resolver = getDidResolver()
  const subjectDid = createDidWebUri("https://subject.example.com")

  const issuerKeypair = await generateKeypair("secp256k1")
  const issuerDid = createDidWebUri("https://issuer.example.com")
  resolver.addToCache(
    issuerDid,
    createDidDocumentFromKeypair({
      did: issuerDid,
      keypair: issuerKeypair,
    }),
  )

  // Generate an unsigned attestation
  const credential = createCredential({
    id: "test-credential",
    type: "TestCredential",
    subject: subjectDid,
    issuer: issuerDid,
    attestation: {
      test: "test",
    },
  })

  credential.issuer = {
    id: issuerDid,
  }

  const vc = {
    ...credential,
    // just dummy fields, we mock the actual proof verification
    proof: {
      type: "JwtProof2020",
      jwt: "test.jwt.token",
    },
  } as unknown as Verifiable<W3CCredential>

  return { vc, issuerDid, resolver }
}

describe("verifyParsedCredential", () => {
  beforeEach(() => {
    vi.mocked(isExpired).mockReturnValue(false)
    vi.mocked(isRevoked).mockResolvedValue(false)
    vi.mocked(verifyProof).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws when no proof is present", async () => {
    const { vc: baseVc, issuerDid, resolver } = await setup()

    const vc = {
      ...baseVc,
      proof: undefined,
    }

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
      }),
    ).rejects.toThrow(InvalidProofError)
  })

  it("throws for an expired credential", async () => {
    const { vc, issuerDid, resolver } = await setup()

    vi.mocked(isExpired).mockReturnValue(true)

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
      }),
    ).rejects.toThrow(CredentialExpiredError)
  })

  it("throws for a revoked credential", async () => {
    const { vc, issuerDid, resolver } = await setup()

    vi.mocked(isRevoked).mockResolvedValue(true)

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
      }),
    ).rejects.toThrow(CredentialRevokedError)
  })

  it("throws for non-trusted issuer", async () => {
    const { vc, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: ["did:example:123"],
        resolver,
      }),
    ).rejects.toThrow(UntrustedIssuerError)
  })

  it("throws for an invalid proof", async () => {
    const { vc, issuerDid, resolver } = await setup()

    vi.mocked(verifyProof).mockRejectedValueOnce(new InvalidProofError())

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
      }),
    ).rejects.toThrow(InvalidProofError)
  })

  it("throws if any claim verifier fails", async () => {
    const { vc, issuerDid, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
        verifiers: [
          {
            accepts: () => true,
            verify: () => Promise.resolve(),
          },
          {
            accepts: () => true,
            verify: () =>
              Promise.reject(new Error("Invalid credential subject")),
          },
        ],
      }),
    ).rejects.toThrow("Invalid credential subject")
  })

  it("throws if credential type does not match any verifiers", async () => {
    const { vc, issuerDid, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
        verifiers: [
          {
            accepts: () => false,
            verify: () => Promise.resolve(),
          },
        ],
      }),
    ).rejects.toThrow(UnsupportedCredentialTypeError)
  })

  it("verifies a valid credential with verifiers", async () => {
    const { vc, issuerDid, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
        verifiers: [
          {
            accepts: () => true,
            verify: () => Promise.resolve(),
          },
        ],
      }),
    ).resolves.not.toThrow()
  })

  it("verifies a valid credential with no verifiers", async () => {
    const { vc, issuerDid, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        trustedIssuers: [issuerDid],
        resolver,
      }),
    ).resolves.not.toThrow()
  })

  it("verifies a valid credential without a list of trusted issuers", async () => {
    const { vc, resolver } = await setup()

    await expect(
      verifyParsedCredential(vc, {
        resolver,
        verifiers: [
          {
            accepts: () => true,
            verify: () => Promise.resolve(),
          },
        ],
      }),
    ).resolves.not.toThrow()
  })
})
