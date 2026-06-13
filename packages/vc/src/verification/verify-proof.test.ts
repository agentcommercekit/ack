import type { Resolvable } from "@agentcommercekit/did"
import { verifyCredential, type VerifiedCredential } from "did-jwt-vc"
import { describe, expect, it, vi } from "vitest"

import { InvalidProofError, UnsupportedProofTypeError } from "./errors"
import { verifyProof } from "./verify-proof"

vi.mock("did-jwt-vc", async () => {
  const actual = await vi.importActual("did-jwt-vc")
  return {
    ...actual,
    verifyCredential: vi.fn(),
  }
})

vi.mock("./verify-credential-jwt", () => ({
  verifyCredentialJwt: vi.fn(),
}))

describe("verifyProof", () => {
  const mockResolver = {
    resolve: vi.fn(),
  } as unknown as Resolvable

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

  it("successfully verifies a valid JwtProof2020 and returns the decoded credential", async () => {
    const validProof = {
      type: "JwtProof2020",
      jwt: "valid.jwt.token",
    }

    const decoded = {
      issuer: { id: "did:example:signed-issuer" },
    }

    vi.mocked(verifyCredential).mockResolvedValueOnce({
      verifiableCredential: decoded,
    } as unknown as VerifiedCredential)

    // The returned credential must come from the decoded proof payload, not the
    // caller-supplied proof object.
    await expect(verifyProof(validProof, mockResolver)).resolves.toBe(decoded)
  })
})
