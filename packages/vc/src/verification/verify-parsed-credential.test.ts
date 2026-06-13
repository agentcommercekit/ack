import { createDidKeyUri, getDidResolver } from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCredential } from "../create-credential"
import { signCredential } from "../signing/sign-credential"
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
import { parseJwtCredential } from "./parse-jwt-credential"
import { verifyParsedCredential } from "./verify-parsed-credential"

// Expiry and revocation are checked elsewhere; mock them so each test can
// drive those branches independently of the (real) signed credential.
vi.mock("./is-expired", () => ({
  isExpired: vi.fn(),
}))

vi.mock("./is-revoked", () => ({
  isRevoked: vi.fn(),
}))

async function setup() {
  const resolver = getDidResolver()

  const issuerKeypair = await generateKeypair("secp256k1")
  const issuerDid = createDidKeyUri(issuerKeypair)
  const subjectDid = createDidKeyUri(await generateKeypair("secp256k1"))

  const unsigned = createCredential({
    id: "test-credential",
    type: "TestCredential",
    subject: subjectDid,
    issuer: issuerDid,
    attestation: {
      test: "test",
    },
  })

  const jwt = await signCredential(unsigned, {
    did: issuerDid,
    signer: createJwtSigner(issuerKeypair),
  })

  // A real parsed credential, with a signed `proof.jwt`.
  const vc = await parseJwtCredential(jwt, resolver)

  return { vc, issuerDid, resolver }
}

describe("verifyParsedCredential", () => {
  beforeEach(() => {
    vi.mocked(isExpired).mockReturnValue(false)
    vi.mocked(isRevoked).mockResolvedValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws when no proof is present", async () => {
    const { vc, issuerDid, resolver } = await setup()

    await expect(
      verifyParsedCredential(
        { ...vc, proof: undefined } as unknown as W3CCredential,
        {
          trustedIssuers: [issuerDid],
          resolver,
        },
      ),
    ).rejects.toThrow(InvalidProofError)
  })

  it("throws for an invalid proof", async () => {
    const { vc, issuerDid, resolver } = await setup()

    const tampered = {
      ...vc,
      proof: { type: "JwtProof2020", jwt: "invalid.jwt.token" },
    } as unknown as Verifiable<W3CCredential>

    await expect(
      verifyParsedCredential(tampered, {
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

  // Regression for #105 / #108: on the parsed-credential input path, the
  // top-level fields are caller-supplied and not bound to the signed proof.
  // Verification must read the signed payload (`proof.jwt`), so mutating the
  // outer object cannot bypass the issuer or claim-verifier checks.
  describe("binds checks to the signed proof, not caller-supplied fields", () => {
    it("rejects a spoofed issuer even when the outer object names a trusted DID", async () => {
      const { vc, resolver } = await setup()

      const spoofedTrustedDid = "did:web:trusted.example.com"
      const spoofed = {
        ...vc,
        issuer: { id: spoofedTrustedDid },
      } as Verifiable<W3CCredential>

      // The outer issuer claims the trusted DID, but the signed payload was
      // issued by the real (untrusted-here) issuer, so this must be rejected.
      await expect(
        verifyParsedCredential(spoofed, {
          trustedIssuers: [spoofedTrustedDid],
          resolver,
        }),
      ).rejects.toThrow(UntrustedIssuerError)
    })

    it("runs claim verifiers against the signed subject, not a mutated outer subject", async () => {
      const { vc, issuerDid, resolver } = await setup()

      const spoofed = {
        ...vc,
        credentialSubject: { ...vc.credentialSubject, test: "spoofed" },
      } as Verifiable<W3CCredential>

      // The verifier accepts only the signed value ("test"). If verification
      // read the mutated outer subject ("spoofed") this would reject; binding
      // to the signed payload means it sees "test" and passes.
      await expect(
        verifyParsedCredential(spoofed, {
          trustedIssuers: [issuerDid],
          resolver,
          verifiers: [
            {
              accepts: () => true,
              verify: (subject) =>
                (subject as { test?: string }).test === "test"
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error("subject was not the signed value"),
                    ),
            },
          ],
        }),
      ).resolves.not.toThrow()
    })

    it("returns the credential decoded from the signed proof, not the caller-supplied object", async () => {
      const { vc, issuerDid, resolver } = await setup()

      const spoofed = {
        ...vc,
        issuer: { id: "did:web:attacker.example.com" },
        credentialSubject: { ...vc.credentialSubject, test: "spoofed" },
      } as Verifiable<W3CCredential>

      const verified = await verifyParsedCredential(spoofed, { resolver })

      // The returned credential is the signed one, regardless of the mutated
      // outer fields the caller supplied.
      expect(verified.issuer.id).toBe(issuerDid)
      expect((verified.credentialSubject as { test?: string }).test).toBe(
        "test",
      )
    })

    it("selects claim verifiers by the signed type, not a mutated outer type", async () => {
      const { vc, issuerDid, resolver } = await setup()

      const spoofed = {
        ...vc,
        type: ["VerifiableCredential", "SpoofedType"],
      } as Verifiable<W3CCredential>

      let receivedTypes: string[] | undefined

      await expect(
        verifyParsedCredential(spoofed, {
          trustedIssuers: [issuerDid],
          resolver,
          verifiers: [
            {
              accepts: (type) => {
                receivedTypes = type
                return type.includes("TestCredential")
              },
              verify: () => Promise.resolve(),
            },
          ],
        }),
      ).resolves.toBeDefined()

      expect(receivedTypes).toContain("TestCredential")
      expect(receivedTypes).not.toContain("SpoofedType")
    })
  })
})
