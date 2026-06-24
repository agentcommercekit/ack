import type { Resolvable } from "@agentcommercekit/did"
import { verifyCredential } from "did-jwt-vc"
import { describe, expect, it, vi } from "vitest"

import { InvalidProofError, UnsupportedProofTypeError } from "./errors"
import { verifyProof } from "./verify-proof"

vi.mock("did-jwt-vc", async () => {
  const actual =
    await vi.importActual<typeof import("did-jwt-vc")>("did-jwt-vc")
  return {
    ...actual,
    verifyCredential: vi.fn<typeof verifyCredential>(),
  }
})

vi.mock("./verify-credential-jwt", () => ({
  verifyCredentialJwt: vi.fn<() => void>(),
}))

/**
 * Replace the next `verifyCredential` call with one that returns the given
 * decoded credential shape. The real return type promises a valid
 * `Verifiable<W3CCredential>`; the override is typed to accept any decoded value
 * so tests can supply minimal fixtures.
 */
function mockDecodedCredential(verifiableCredential: unknown): void {
  vi.mocked(verifyCredential).mockImplementationOnce(() =>
    Promise.resolve(
      Object.assign(Object.create(null), { verifiableCredential }),
    ),
  )
}

describe("verifyProof", () => {
  const mockResolver: Resolvable = {
    resolve: vi.fn<Resolvable["resolve"]>(),
  }

  it("throws for invalid proof payload", async () => {
    const invalidProof = {
      type: "JwtProof2020",
      // Missing jwt field
    }

    await expect(verifyProof(invalidProof, mockResolver)).rejects.toThrow(
      InvalidProofError,
    )
  })

  it("throws for unsupported proof type", async () => {
    const unsupportedProof = {
      type: "UnsupportedProofType",
      jwt: "some.jwt.token",
    }

    await expect(verifyProof(unsupportedProof, mockResolver)).rejects.toThrow(
      UnsupportedProofTypeError,
    )
  })

  it("handles verification errors from verifyCredentialJwt", async () => {
    const proofWithInvalidJwt = {
      type: "JwtProof2020",
      jwt: "invalid.jwt.token",
    }

    vi.mocked(verifyCredential).mockRejectedValueOnce(new Error("invalid_jwt"))
    await expect(
      verifyProof(proofWithInvalidJwt, mockResolver),
    ).rejects.toThrow(InvalidProofError)
  })

  it("returns the credential decoded from the verified proof", async () => {
    const validProof = {
      type: "JwtProof2020",
      jwt: "valid.jwt.token",
    }

    const verifiableCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      issuer: { id: "did:example:issuer" },
      issuanceDate: "2024-01-01T00:00:00.000Z",
      credentialSubject: { id: "did:example:subject" },
      proof: { type: "JwtProof2020", jwt: "valid.jwt.token" },
    }

    mockDecodedCredential(verifiableCredential)

    await expect(verifyProof(validProof, mockResolver)).resolves.toBe(
      verifiableCredential,
    )
  })
})
