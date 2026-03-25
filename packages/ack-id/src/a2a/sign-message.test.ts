import type { DidUri } from "@agentcommercekit/did"
import { createJwt, createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import type { W3CCredential } from "@agentcommercekit/vc"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createA2AHandshakeMessage,
  createA2AHandshakeMessageFromJwt,
  createA2AHandshakePayload,
  createSignedA2AMessage,
} from "./sign-message"

// Mock uuid to return deterministic values
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}))

// Mock random to return deterministic values
vi.mock("./random", async () => {
  const actual =
    await vi.importActual<typeof import("./random")>("./random")
  return {
    ...actual,
    generateRandomJti: vi.fn(() => "test-jti-1234"),
    generateRandomNonce: vi.fn(() => "test-nonce-1234"),
  }
})

describe("createA2AHandshakePayload", () => {
  const recipient = "did:web:recipient.example.com" as DidUri
  const vc: W3CCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "ControllerCredential"],
    issuer: { id: "did:web:issuer.example.com" },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: "did:web:subject.example.com" },
  }

  it("creates a payload with aud, nonce, and vc", () => {
    const payload = createA2AHandshakePayload({ recipient, vc })

    expect(payload.aud).toBe(recipient)
    expect(payload.nonce).toBe("test-nonce-1234")
    expect(payload.vc).toBe(vc)
  })

  it("creates a payload without replyNonce when no requestNonce is provided", () => {
    const payload = createA2AHandshakePayload({ recipient, vc })

    expect(payload).toHaveProperty("nonce")
    expect(payload).not.toHaveProperty("replyNonce")
  })

  it("includes replyNonce when requestNonce is provided", () => {
    const payload = createA2AHandshakePayload({
      recipient,
      vc,
      requestNonce: "original-nonce",
    })

    expect(payload.nonce).toBe("original-nonce")
    expect(payload).toHaveProperty("replyNonce", "test-nonce-1234")
  })
})

describe("createA2AHandshakeMessageFromJwt", () => {
  it("creates a message with agent role", () => {
    const jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.test.sig"
    const message = createA2AHandshakeMessageFromJwt("agent", jwt)

    expect(message).toEqual({
      kind: "message",
      messageId: "test-uuid-1234",
      role: "agent",
      parts: [
        {
          kind: "data",
          data: { jwt },
        },
      ],
    })
  })

  it("creates a message with user role", () => {
    const jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.test.sig"
    const message = createA2AHandshakeMessageFromJwt("user", jwt)

    expect(message.role).toBe("user")
    expect(message.kind).toBe("message")
  })

  it("places the JWT in a data part", () => {
    const jwt = "some-jwt-token"
    const message = createA2AHandshakeMessageFromJwt("agent", jwt)

    expect(message.parts).toHaveLength(1)
    expect(message.parts[0]).toEqual({
      kind: "data",
      data: { jwt },
    })
  })
})

describe("createSignedA2AMessage", () => {
  let signOptions: {
    did: DidUri
    jwtSigner: ReturnType<typeof createJwtSigner>
  }

  beforeEach(async () => {
    const keypair = await generateKeypair("secp256k1")
    signOptions = {
      did: "did:web:signer.example.com" as DidUri,
      jwtSigner: createJwtSigner(keypair),
    }
  })

  it("signs a message and returns sig, jti, and signed message", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
    }

    const result = await createSignedA2AMessage(message, signOptions)

    expect(result.sig).toBeDefined()
    expect(typeof result.sig).toBe("string")
    expect(result.jti).toBe("test-jti-1234")
    expect(result.message.metadata).toBeDefined()
    expect(result.message.metadata?.sig).toBe(result.sig)
  })

  it("preserves original message parts in the signed message", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "agent" as const,
      parts: [{ kind: "text" as const, text: "response" }],
    }

    const result = await createSignedA2AMessage(message, signOptions)

    expect(result.message.kind).toBe("message")
    expect(result.message.messageId).toBe("msg-1")
    expect(result.message.role).toBe("agent")
    expect(result.message.parts).toEqual([
      { kind: "text", text: "response" },
    ])
  })

  it("merges sig into existing metadata", async () => {
    const message = {
      kind: "message" as const,
      messageId: "msg-1",
      role: "user" as const,
      parts: [{ kind: "text" as const, text: "hello" }],
      metadata: { customField: "value" },
    }

    const result = await createSignedA2AMessage(message, signOptions)

    expect(result.message.metadata?.sig).toBe(result.sig)
    expect(result.message.metadata?.customField).toBe("value")
  })
})

describe("createA2AHandshakeMessage", () => {
  let signOptions: {
    did: DidUri
    jwtSigner: ReturnType<typeof createJwtSigner>
  }

  const vc: W3CCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "ControllerCredential"],
    issuer: { id: "did:web:issuer.example.com" },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: "did:web:subject.example.com" },
  }

  beforeEach(async () => {
    const keypair = await generateKeypair("secp256k1")
    signOptions = {
      did: "did:web:signer.example.com" as DidUri,
      jwtSigner: createJwtSigner(keypair),
    }
  })

  it("creates a signed handshake message with agent role", async () => {
    const result = await createA2AHandshakeMessage(
      "agent",
      {
        recipient: "did:web:recipient.example.com" as DidUri,
        vc,
      },
      signOptions,
    )

    expect(result.sig).toBeDefined()
    expect(typeof result.sig).toBe("string")
    expect(result.jti).toBe("test-jti-1234")
    expect(result.nonce).toBe("test-nonce-1234")
    expect(result.message.role).toBe("agent")
    expect(result.message.kind).toBe("message")
    expect(result.message.parts).toHaveLength(1)
    expect(result.message.parts[0].kind).toBe("data")
  })

  it("creates a signed handshake message with user role", async () => {
    const result = await createA2AHandshakeMessage(
      "user",
      {
        recipient: "did:web:recipient.example.com" as DidUri,
        vc,
      },
      signOptions,
    )

    expect(result.message.role).toBe("user")
  })

  it("includes the JWT in the message data part", async () => {
    const result = await createA2AHandshakeMessage(
      "agent",
      {
        recipient: "did:web:recipient.example.com" as DidUri,
        vc,
      },
      signOptions,
    )

    const dataPart = result.message.parts[0] as { kind: string; data: { jwt: string } }
    expect(dataPart.data.jwt).toBe(result.sig)
  })
})
