import { describe, expect, it, vi } from "vitest"

import {
  agentDid,
  expectedSignedPayload,
  handshakeMessage,
  mockVerifiedJwt,
  signedMessage,
  testCredential,
  unsignedMessage,
  userDid,
} from "./test-fixtures"
import { verifyA2AHandshakeMessage, verifyA2ASignedMessage } from "./verify"

vi.mock("@agentcommercekit/jwt", async () => {
  const actual = await vi.importActual<typeof import("@agentcommercekit/jwt")>(
    "@agentcommercekit/jwt",
  )
  return {
    ...actual,
    verifyJwt: vi.fn(),
  }
})

vi.mock("@agentcommercekit/did", async () => {
  const actual = await vi.importActual<typeof import("@agentcommercekit/did")>(
    "@agentcommercekit/did",
  )
  return {
    ...actual,
    getDidResolver: vi.fn(() => ({})),
  }
})

const { verifyJwt } = await import("@agentcommercekit/jwt")

// --- Handshake verification ---

describe("verifyA2AHandshakeMessage", () => {
  it("returns issuer, nonce, and credential from a valid handshake", async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt({
        iss: userDid,
        nonce: "challenge-nonce",
        vc: testCredential,
      }),
    )

    const result = await verifyA2AHandshakeMessage(handshakeMessage(), {
      did: agentDid,
      counterparty: userDid,
    })

    expect(result.iss).toBe(userDid)
    expect(result.nonce).toBe("challenge-nonce")
    expect(result.vc).toEqual(testCredential)
  })

  it("requires audience=self and issuer=counterparty for JWT verification", async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt({
        iss: userDid,
        nonce: "n",
        vc: testCredential,
      }),
    )

    await verifyA2AHandshakeMessage(handshakeMessage("the.jwt"), {
      did: agentDid,
      counterparty: userDid,
    })

    expect(verifyJwt).toHaveBeenCalledWith("the.jwt", {
      audience: agentDid,
      issuer: userDid,
      resolver: expect.anything(),
    })
  })

  // The message schema uses valibot's v.parse(), which rejects structurally
  // invalid input before any JWT verification happens. This matters because
  // a malformed message should fail fast, not trigger a network call to
  // resolve a DID.
  it.each([
    { name: "null message", message: null },
    {
      name: "empty parts array",
      message: { kind: "message", messageId: "m", role: "user", parts: [] },
    },
    {
      name: "text part instead of data part",
      message: {
        kind: "message",
        messageId: "m",
        role: "user",
        parts: [{ kind: "text", text: "x" }],
      },
    },
    {
      name: "data part without jwt field",
      message: {
        kind: "message",
        messageId: "m",
        role: "user",
        parts: [{ kind: "data", data: { notJwt: "x" } }],
      },
    },
  ])("rejects $name", async ({ message }) => {
    await expect(
      verifyA2AHandshakeMessage(message as never, { did: agentDid }),
    ).rejects.toThrow()
  })

  it("throws when JWT verification fails", async () => {
    vi.mocked(verifyJwt).mockRejectedValueOnce(
      new Error("JWT verification failed"),
    )

    await expect(
      verifyA2AHandshakeMessage(handshakeMessage(), { did: agentDid }),
    ).rejects.toThrow("JWT verification failed")
  })

  it("throws when the verified payload is missing required handshake fields", async () => {
    // JWT is valid but payload lacks nonce and vc — not a proper handshake
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt({ iss: userDid }),
    )

    await expect(
      verifyA2AHandshakeMessage(handshakeMessage(), {
        did: agentDid,
        counterparty: userDid,
      }),
    ).rejects.toThrow()
  })

  it("throws when issuer is not a valid DID URI", async () => {
    // The handshake payload schema requires iss to be a did: URI.
    // A compromised or misconfigured peer might send a plain string.
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt({
        iss: "not-a-did",
        nonce: "n",
        vc: testCredential,
      }),
    )

    await expect(
      verifyA2AHandshakeMessage(handshakeMessage(), { did: agentDid }),
    ).rejects.toThrow()
  })
})

// --- Signed message verification ---

describe("verifyA2ASignedMessage", () => {
  function mockValidSignature() {
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt(expectedSignedPayload()),
    )
  }

  it("returns verified when message content matches its JWT signature", async () => {
    mockValidSignature()

    const result = await verifyA2ASignedMessage(signedMessage(), {
      did: agentDid,
      counterparty: userDid,
    })

    expect(result.verified).toBe(true)
  })

  it("requires audience=self and issuer=counterparty for signature verification", async () => {
    mockValidSignature()

    await verifyA2ASignedMessage(signedMessage("hello", "the.sig"), {
      did: agentDid,
      counterparty: userDid,
    })

    expect(verifyJwt).toHaveBeenCalledWith("the.sig", {
      audience: agentDid,
      issuer: userDid,
      resolver: expect.anything(),
    })
  })

  it("throws for unsigned messages (no metadata at all)", async () => {
    await expect(
      verifyA2ASignedMessage(unsignedMessage(), { did: agentDid }),
    ).rejects.toThrow()
  })

  it("throws for messages with metadata but no sig field", async () => {
    const noSig = { ...unsignedMessage(), metadata: { traceId: "abc" } }

    await expect(
      verifyA2ASignedMessage(noSig as never, { did: agentDid }),
    ).rejects.toThrow()
  })

  it("throws when message content diverges from signed payload", async () => {
    // Signature covers "original content" but the message body says "tampered"
    vi.mocked(verifyJwt).mockResolvedValueOnce(
      mockVerifiedJwt({
        message: {
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [{ kind: "text", text: "original content" }],
        },
      }),
    )

    await expect(
      verifyA2ASignedMessage(signedMessage("tampered"), {
        did: agentDid,
        counterparty: userDid,
      }),
    ).rejects.toThrow("Message parts do not match")
  })

  it("throws when the underlying JWT signature is invalid", async () => {
    vi.mocked(verifyJwt).mockRejectedValueOnce(new Error("Signature invalid"))

    await expect(
      verifyA2ASignedMessage(signedMessage(), { did: agentDid }),
    ).rejects.toThrow("Signature invalid")
  })

  it("returns verified when server-injected contextId is present", async () => {
    // A2A servers may auto-assign a contextId after the client signs the
    // message. The verification must strip it before comparing, otherwise
    // every message routed through a server would fail validation.
    mockValidSignature()

    const messageWithContextId = {
      ...signedMessage(),
      contextId: "ctx-server-assigned",
    }

    const result = await verifyA2ASignedMessage(messageWithContextId, {
      did: agentDid,
      counterparty: userDid,
    })

    expect(result.verified).toBe(true)
  })
})
