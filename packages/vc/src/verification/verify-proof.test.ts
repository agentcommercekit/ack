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

function createVerifiedCredential(
  verifiableCredential: VerifiedCredential["verifiableCredential"],
  jwt: string,
): VerifiedCredential {
  const issuer = verifiableCredential.issuer.id

  return {
    verified: true,
    payload: {},
    didResolutionResult: {
      didResolutionMetadata: {},
      didDocument: null,
      didDocumentMetadata: {},
    },
    issuer,
    signer: {
      id: `${issuer}#key-1`,
      type: "JsonWebKey2020",
      controller: issuer,
    },
    jwt,
    verifiableCredential,
  }
}

describe("verifyProof", () => {
  const mockResolver: Resolvable = {
    resolve: vi.fn(async () => ({
      didResolutionMetadata: {},
      didDocument: null,
      didDocumentMetadata: {},
    })),
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

  it("handles verification errors from verifyCredential", async () => {
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
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "TestCredential"],
      issuer: { id: "did:example:signed-issuer" },
      issuanceDate: "2026-01-01T00:00:00.000Z",
      credentialSubject: { id: "did:example:subject" },
      proof: validProof,
    }

    vi.mocked(verifyCredential).mockResolvedValueOnce(
      createVerifiedCredential(decoded, validProof.jwt),
    )

    // The returned credential must come from the decoded proof payload, not the
    // caller-supplied proof object.
    await expect(verifyProof(validProof, mockResolver)).resolves.toBe(decoded)
  })

  it("throws when verifyCredential returns a malformed decoded credential", async () => {
    const validProof = {
      type: "JwtProof2020",
      jwt: "valid.jwt.token",
    }
    const validDecoded = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "TestCredential"],
      issuer: { id: "did:example:signed-issuer" },
      issuanceDate: "2026-01-01T00:00:00.000Z",
      credentialSubject: { id: "did:example:subject" },
      proof: validProof,
    }
    // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- exercises malformed data from the external verifier.
    const malformedCredential = {
      issuer: { id: "did:example:signed-issuer" },
    } as unknown as VerifiedCredential["verifiableCredential"]

    vi.mocked(verifyCredential).mockResolvedValueOnce({
      ...createVerifiedCredential(validDecoded, validProof.jwt),
      verifiableCredential: malformedCredential,
    })

    await expect(verifyProof(validProof, mockResolver)).rejects.toThrow(
      InvalidProofError,
    )
  })
})
