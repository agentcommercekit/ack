import type { JwtSigner } from "@agentcommercekit/jwt"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createA2AHandshakeMessage,
  createA2AHandshakeMessageFromJwt,
  createA2AHandshakePayload,
  createSignedA2AMessage,
} from "./sign-message"
import {
  agentDid,
  makeTextMessage,
  testCredential,
  userDid,
} from "./test-fixtures"

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}))

vi.mock("./random", async () => {
  const actual = await vi.importActual<typeof import("./random")>("./random")
  return {
    ...actual,
    generateRandomJti: vi.fn(() => "test-jti-1234"),
    generateRandomNonce: vi.fn(() => "test-nonce-1234"),
  }
})

describe("createA2AHandshakePayload", () => {
  it("creates a payload addressed to the recipient with a fresh nonce", () => {
    const payload = createA2AHandshakePayload({
      recipient: userDid,
      vc: testCredential,
    })

    expect(payload.aud).toBe(userDid)
    expect(payload.nonce).toBe("test-nonce-1234")
    expect(payload.vc).toBe(testCredential)
    expect(payload).not.toHaveProperty("replyNonce")
  })

  it("returns the request nonce and generates a new reply nonce for responses", () => {
    const payload = createA2AHandshakePayload({
      recipient: userDid,
      vc: testCredential,
      requestNonce: "original-nonce",
    })

    // The initiator's nonce becomes ours so they can correlate the reply
    expect(payload.nonce).toBe("original-nonce")
    // We generate a fresh nonce for the next leg of the handshake
    expect(payload.replyNonce).toBe("test-nonce-1234")
  })
})

describe("createA2AHandshakeMessageFromJwt", () => {
  it("creates an A2A data-part message from a JWT", () => {
    const jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.test.sig"

    expect(createA2AHandshakeMessageFromJwt("agent", jwt)).toEqual({
      kind: "message",
      messageId: "test-uuid-1234",
      role: "agent",
      parts: [{ kind: "data", data: { jwt } }],
    })
  })

  it("returns the correct role in the message", () => {
    const message = createA2AHandshakeMessageFromJwt("user", "any.jwt")
    expect(message.role).toBe("user")
  })
})

describe("createSignedA2AMessage", () => {
  let jwtSigner: JwtSigner

  beforeEach(async () => {
    const keypair = await generateKeypair("secp256k1")
    jwtSigner = createJwtSigner(keypair)
  })

  it("creates a JWT signature and attaches it to message metadata", async () => {
    const result = await createSignedA2AMessage(makeTextMessage(), {
      did: agentDid,
      jwtSigner,
    })

    expect(result.sig).toEqual(expect.any(String))
    expect(result.jti).toBe("test-jti-1234")
    expect(result.message.metadata?.sig).toBe(result.sig)
  })

  it("returns original message content alongside the signature", async () => {
    const original = makeTextMessage("agent")
    const result = await createSignedA2AMessage(original, {
      did: agentDid,
      jwtSigner,
    })

    expect(result.message.kind).toBe("message")
    expect(result.message.role).toBe("agent")
    expect(result.message.parts).toEqual(original.parts)
  })

  it("creates metadata with signature merged into existing fields", async () => {
    const message = makeTextMessage("user", { traceId: "abc" })
    const result = await createSignedA2AMessage(message, {
      did: agentDid,
      jwtSigner,
    })

    expect(result.message.metadata?.sig).toBe(result.sig)
    expect(result.message.metadata?.traceId).toBe("abc")
  })
})

describe("createA2AHandshakeMessage", () => {
  let jwtSigner: JwtSigner

  beforeEach(async () => {
    const keypair = await generateKeypair("secp256k1")
    jwtSigner = createJwtSigner(keypair)
  })

  it("creates a signed credential handshake and returns the nonce for correlation", async () => {
    const result = await createA2AHandshakeMessage(
      "agent",
      { recipient: userDid, vc: testCredential },
      { did: agentDid, jwtSigner },
    )

    expect(result.sig).toEqual(expect.any(String))
    expect(result.jti).toBe("test-jti-1234")
    expect(result.nonce).toBe("test-nonce-1234")
    expect(result.message.role).toBe("agent")
  })

  it("returns the signed JWT in the message data part", async () => {
    const result = await createA2AHandshakeMessage(
      "agent",
      { recipient: userDid, vc: testCredential },
      { did: agentDid, jwtSigner },
    )

    expect(result.message.parts[0]).toEqual(
      expect.objectContaining({ kind: "data", data: { jwt: result.sig } }),
    )
  })
})
