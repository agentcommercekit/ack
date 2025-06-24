import { generateKeypair } from "@agentcommercekit/keys"
import { verifyJWT } from "did-jwt"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createJwt } from "./create-jwt"
import { createJwtSigner } from "./signer"
import { verifyJwt } from "./verify"
import type { JWTVerified } from "did-jwt"

// Mock did-jwt for testing
vi.mock("did-jwt", async () => {
  const actual = await vi.importActual("did-jwt")
  return {
    ...actual,
    verifyJWT: vi.fn()
  }
})

describe("verifyJwt()", () => {
  let keypair: Awaited<ReturnType<typeof generateKeypair>>
  let signer: ReturnType<typeof createJwtSigner>

  beforeEach(async () => {
    keypair = await generateKeypair("secp256k1")
    signer = createJwtSigner(keypair)
  })

  it("verifies a JWT", async () => {
    const jwt = await createJwt(
      {
        sub: "did:example:subject",
        aud: "did:example:audience"
      },
      {
        issuer: "did:example:issuer",
        signer
      }
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject",
        aud: "did:example:audience"
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {}
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: "did:example:issuer",
        publicKeyHex: "02..."
      },
      jwt
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
        sub: "did:example:subject"
      },
      {
        issuer: "did:example:issuer",
        signer
      }
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject"
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {}
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: "did:example:issuer",
        publicKeyHex: "02..."
      },
      jwt
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    const result = await verifyJwt(jwt, {
      issuer: "did:example:issuer"
    })

    expect(result.payload.iss).toBe("did:example:issuer")
  })

  it("throws error when issuer does not match expected issuer", async () => {
    const jwt = await createJwt(
      {
        iss: "did:example:issuer",
        sub: "did:example:subject"
      },
      {
        issuer: "did:example:issuer",
        signer
      }
    )

    const mockVerifiedResult: JWTVerified = {
      verified: true,
      payload: {
        iss: "did:example:issuer",
        sub: "did:example:subject"
      },
      didResolutionResult: {
        didResolutionMetadata: {},
        didDocument: null,
        didDocumentMetadata: {}
      },
      issuer: "did:example:issuer",
      signer: {
        id: "did:example:issuer#key-1",
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: "did:example:issuer",
        publicKeyHex: "02..."
      },
      jwt
    }

    vi.mocked(verifyJWT).mockResolvedValueOnce(mockVerifiedResult)

    await expect(
      verifyJwt(jwt, {
        issuer: "did:example:different"
      })
    ).rejects.toThrow(
      "Expected issuer did:example:different, got did:example:issuer"
    )
  })
})
