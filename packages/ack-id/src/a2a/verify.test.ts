import type { DidUri } from "@agentcommercekit/did"
import type { JwtVerified } from "@agentcommercekit/jwt"
import { describe, expect, it, vi } from "vitest"

import { verifyA2AHandshakeMessage, verifyA2ASignedMessage } from "./verify"

// Mock verifyJwt
vi.mock("@agentcommercekit/jwt", async () => {
  const actual =
    await vi.importActual<typeof import("@agentcommercekit/jwt")>(
      "@agentcommercekit/jwt",
    )
  return {
    ...actual,
    verifyJwt: vi.fn(),
  }
})

// Mock getDidResolver
vi.mock("@agentcommercekit/did", async () => {
  const actual =
    await vi.importActual<typeof import("@agentcommercekit/did")>(
      "@agentcommercekit/did",
    )
  return {
    ...actual,
    getDidResolver: vi.fn(() => ({})),
  }
})

// Import mocked modules
const { verifyJwt } = await import("@agentcommercekit/jwt")

function createMockJwtVerified(
  payload: Record<string, unknown>,
): JwtVerified {
  return {
    verified: true,
    payload: {
      iss: "did:web:issuer.example.com",
      ...payload,
    },
    didResolutionResult: {
      didResolutionMetadata: {},
      didDocument: null,
      didDocumentMetadata: {},
    },
    issuer: "did:web:issuer.example.com",
    signer: {
      id: "did:web:issuer.example.com#key-1",
      type: "Multikey",
      controller: "did:web:issuer.example.com",
      publicKeyHex: "02...",
    },
    jwt: "mock.jwt.token",
  }
}

describe("verifyA2AHandshakeMessage", () => {
  const did = "did:web:agent.example.com" as DidUri
  const counterparty = "did:web:user.example.com" as DidUri

  it("verifies a valid handshake message", async () => {
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "ControllerCredential"],
      issuer: { id: "did:web:issuer.example.com" },
      issuanceDate: "2025-01-01T00:00:00.000Z",
      credentialSubject: { id: "did:web:subject.example.com" },
    }

    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        iss: counterparty,
        nonce: "test-nonce",
        vc,
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { jwt: "valid.jwt.token" },
        },
      ],
    }

    const result = await verifyA2AHandshakeMessage(message, {
      did,
      counterparty,
    })

    expect(result.iss).toBe(counterparty)
    expect(result.nonce).toBe("test-nonce")
    expect(result.vc).toEqual(vc)
  })

  it("throws when message is null", async () => {
    await expect(
      verifyA2AHandshakeMessage(null, { did }),
    ).rejects.toThrow()
  })

  it("throws when message has no parts", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("throws when message part is not a data part", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "not a data part" }],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("throws when data part has no jwt field", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { notJwt: "something" },
        },
      ],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("throws when JWT verification fails", async () => {
    vi.mocked(verifyJwt).mockRejectedValueOnce(
      new Error("JWT verification failed"),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { jwt: "invalid.jwt.token" },
        },
      ],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did }),
    ).rejects.toThrow("JWT verification failed")
  })

  it("throws when payload is missing required fields", async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        iss: counterparty,
        // missing nonce and vc
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { jwt: "valid.jwt.token" },
        },
      ],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did, counterparty }),
    ).rejects.toThrow()
  })

  it("throws when iss is not a valid DID URI", async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        iss: "not-a-did",
        nonce: "test-nonce",
        vc: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: { id: "did:web:issuer.example.com" },
          issuanceDate: "2025-01-01T00:00:00.000Z",
          credentialSubject: { id: "did:web:subject.example.com" },
        },
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { jwt: "valid.jwt.token" },
        },
      ],
    }

    await expect(
      verifyA2AHandshakeMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("passes counterparty as issuer to verifyJwt", async () => {
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "ControllerCredential"],
      issuer: { id: "did:web:issuer.example.com" },
      issuanceDate: "2025-01-01T00:00:00.000Z",
      credentialSubject: { id: "did:web:subject.example.com" },
    }

    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        iss: counterparty,
        nonce: "test-nonce",
        vc,
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [
        {
          kind: "data" as const,
          data: { jwt: "valid.jwt.token" },
        },
      ],
    }

    await verifyA2AHandshakeMessage(message, { did, counterparty })

    expect(verifyJwt).toHaveBeenCalledWith("valid.jwt.token", {
      audience: did,
      issuer: counterparty,
      resolver: expect.anything(),
    })
  })
})

describe("verifyA2ASignedMessage", () => {
  const did = "did:web:agent.example.com" as DidUri
  const counterparty = "did:web:user.example.com" as DidUri

  it("verifies a valid signed message", async () => {
    const messageContent = {
      kind: "message",
      messageId: "msg-1",
      role: "user",
      parts: [{ kind: "text", text: "hello" }],
    }

    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        message: messageContent,
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { sig: "valid.jwt.signature" },
    }

    const result = await verifyA2ASignedMessage(message, {
      did,
      counterparty,
    })

    expect(result.verified).toBe(true)
  })

  it("throws when message has no metadata", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
    }

    await expect(
      verifyA2ASignedMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("throws when metadata has no sig field", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { other: "data" },
    }

    await expect(
      verifyA2ASignedMessage(message, { did }),
    ).rejects.toThrow()
  })

  it("throws when message parts do not match signature payload", async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        message: {
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [{ kind: "text", text: "different content" }],
        },
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { sig: "valid.jwt.signature" },
    }

    await expect(
      verifyA2ASignedMessage(message, { did, counterparty }),
    ).rejects.toThrow("Message parts do not match")
  })

  it("throws when JWT verification fails", async () => {
    vi.mocked(verifyJwt).mockRejectedValueOnce(
      new Error("Signature invalid"),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { sig: "bad.jwt.signature" },
    }

    await expect(
      verifyA2ASignedMessage(message, { did }),
    ).rejects.toThrow("Signature invalid")
  })

  it("strips contextId before comparing message content", async () => {
    const messageContent = {
      kind: "message",
      messageId: "msg-1",
      role: "user",
      parts: [{ kind: "text", text: "hello" }],
    }

    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        message: messageContent,
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      contextId: "ctx-auto-generated",
      metadata: { sig: "valid.jwt.signature" },
    }

    const result = await verifyA2ASignedMessage(message, {
      did,
      counterparty,
    })

    expect(result.verified).toBe(true)
  })

  it("passes counterparty as issuer to verifyJwt", async () => {
    const messageContent = {
      kind: "message",
      messageId: "msg-1",
      role: "user",
      parts: [{ kind: "text", text: "hello" }],
    }

    vi.mocked(verifyJwt).mockResolvedValueOnce(
      createMockJwtVerified({
        message: messageContent,
      }),
    )

    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { sig: "valid.jwt.signature" },
    }

    await verifyA2ASignedMessage(message, { did, counterparty })

    expect(verifyJwt).toHaveBeenCalledWith("valid.jwt.signature", {
      audience: did,
      issuer: counterparty,
      resolver: expect.anything(),
    })
  })
})
