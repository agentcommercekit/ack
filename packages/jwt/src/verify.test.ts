import { generateKeypair } from "@agentcommercekit/keys"
import { verifyJWT, type JWTVerified } from "did-jwt"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createJwt } from "./create-jwt"
import { createJwtSigner } from "./signer"
import { verifyJwt } from "./verify"

// Mock did-jwt for testing
vi.mock("did-jwt", async () => {
  const actual = await vi.importActual("did-jwt")
  return {
    ...actual,
    verifyJWT: vi.fn<typeof verifyJWT>(),
  }
})

describe("verifyJwt()", () => {
  let keypair: Awaited<ReturnType<typeof generateKeypair>>
  let signer: ReturnType<typeof createJwtSigner>

  beforeEach(async () => {
    // Clear call history so per-test call-index assertions see only this test.
    vi.mocked(verifyJWT).mockClear()
    keypair = await generateKeypair("secp256k1")
    signer = createJwtSigner(keypair)
  })

  it("verifies a JWT", async () => {
    const jwt = await createJwt(
      {
        sub: "did:example:subject",
        aud: "did:example:audience",
      },
      {
        issuer: "did:example:issuer",
        signer,
      },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
        aud: "did:example:audience",
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    const result = await verifyJwt(jwt, {})

    expect(result.payload.iss).toBe("did:example:issuer")
    expect(result.payload.sub).toBe("did:example:subject")
    expect(result.payload.aud).toBe("did:example:audience")
  })

  it("allows requiring a specific issuer", async () => {
    const jwt = await createJwt(
      {
        iss: "did:example:issuer",
        sub: "did:example:subject",
      },
      {
        issuer: "did:example:issuer",
        signer,
      },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    const result = await verifyJwt(jwt, {
      issuer: "did:example:issuer",
    })

    expect(result.payload.iss).toBe("did:example:issuer")
  })

  it("forwards the audience and passes when the aud claim is present", async () => {
    // The realistic path: the caller supplies `audience` (which did-jwt
    // matches) and `requireAudience` on top (which rejects an absent aud).
    const jwt = await createJwt(
      { sub: "did:example:subject", aud: "did:example:audience" },
      { issuer: "did:example:issuer", signer },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
        aud: "did:example:audience",
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    const result = await verifyJwt(jwt, {
      audience: "did:example:audience",
      requireAudience: true,
    })

    // `audience` is forwarded to did-jwt, `requireAudience` is not.
    expect(verifyJWT).toHaveBeenCalledWith(
      jwt,
      expect.objectContaining({ audience: "did:example:audience" }),
    )
    expect(vi.mocked(verifyJWT).mock.calls[0]?.[1]).not.toHaveProperty(
      "requireAudience",
    )
    expect(result.payload.aud).toBe("did:example:audience")
  })

  it("throws when requireAudience is set and the aud claim is an empty array", async () => {
    const jwt = await createJwt(
      { sub: "did:example:subject" },
      { issuer: "did:example:issuer", signer },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
        aud: [],
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    await expect(verifyJwt(jwt, { requireAudience: true })).rejects.toThrow(
      "JWT audience is required but missing",
    )
  })

  it("throws when requireAudience is set and the aud claim is missing", async () => {
    const jwt = await createJwt(
      { sub: "did:example:subject" },
      { issuer: "did:example:issuer", signer },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: { iss: "did:example:issuer", sub: "did:example:subject" },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    await expect(verifyJwt(jwt, { requireAudience: true })).rejects.toThrow(
      "JWT audience is required but missing",
    )
  })

  it("throws error when issuer does not match expected issuer", async () => {
    const jwt = await createJwt(
      {
        iss: "did:example:issuer",
        sub: "did:example:subject",
      },
      {
        issuer: "did:example:issuer",
        signer,
      },
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {},
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "Multikey",
        controller: "did:example:issuer",
        publicKeyHex: "02...",
      },
      jwt,
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    await expect(
      verifyJwt(jwt, {
        issuer: "did:example:different",
      }),
    ).rejects.toThrow(
      "Expected issuer did:example:different, got did:example:issuer",
    )
  })
})
