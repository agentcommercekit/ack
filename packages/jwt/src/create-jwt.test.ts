import { generateKeypair } from "@agentcommercekit/keys"
import { createJWT as baseCreateJWT } from "did-jwt"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createJwt } from "./create-jwt"
import { createJwtSigner } from "./signer"
import type { JWTOptions, JWTPayload } from "did-jwt"

vi.mock("did-jwt", async () => {
  const actual = await vi.importActual("did-jwt")
  return {
    ...actual,
    createJWT: vi.fn()
  }
})

describe("createJWT", () => {
  let mockOptions: JWTOptions
  const mockPayload: Partial<JWTPayload> = {
    sub: "did:example:123",
    iss: "did:example:456"
  }

  beforeEach(async () => {
    const keypair = await generateKeypair("secp256k1")
    mockOptions = {
      issuer: "did:example:456",
      signer: createJwtSigner(keypair)
    }
  })

  it("creates a valid JWT when baseCreateJWT returns a valid JWT string", async () => {
    const expectedJwt =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpc3MiOiJkaWQ6ZXhhbXBsZTo0NTYifQ.sig"

    vi.mocked(baseCreateJWT).mockResolvedValueOnce(expectedJwt)

    const result = await createJwt(mockPayload, mockOptions)

    expect(result).toBe(expectedJwt)
    expect(baseCreateJWT).toHaveBeenCalledWith(mockPayload, mockOptions, {
      alg: "ES256K"
    })
  })

  it("throws an error when baseCreateJWT returns an invalid JWT string", async () => {
    const invalidJwt = "not-a-valid-jwt"

    vi.mocked(baseCreateJWT).mockResolvedValueOnce(invalidJwt)

    await expect(createJwt(mockPayload, mockOptions)).rejects.toThrow(
      "Failed to create JWT"
    )
  })
})
