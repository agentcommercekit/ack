/**
 * Shared fixtures for A2A test suites.
 *
 * Provides identity constants, message builders, and mock factories so
 * individual test files can focus on behavior rather than setup.
 */
import type { DidUri } from "@agentcommercekit/did"
import type { JwtVerified } from "@agentcommercekit/jwt"
import type { W3CCredential } from "@agentcommercekit/vc"

// --- Identity constants ---

export const agentDid = "did:web:agent.example.com" as DidUri
export const userDid = "did:web:user.example.com" as DidUri

export const testCredential: W3CCredential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  type: ["VerifiableCredential", "ControllerCredential"],
  issuer: { id: "did:web:issuer.example.com" },
  issuanceDate: "2025-01-01T00:00:00.000Z",
  credentialSubject: { id: "did:web:subject.example.com" },
}

// --- Message builders ---

/** A text message, optionally with a specific role or pre-existing metadata. */
export function makeTextMessage(
  role: "agent" | "user" = "user",
  metadata?: Record<string, unknown>,
) {
  return {
    kind: "message" as const,
    messageId: "msg-1",
    role,
    parts: [{ kind: "text" as const, text: "hello" }],
    ...(metadata && { metadata }),
  }
}

/** A handshake message carrying a JWT in its data part. */
export function handshakeMessage(jwt = "valid.jwt.token") {
  return {
    kind: "message" as const,
    messageId: "msg-1",
    role: "user" as const,
    parts: [{ kind: "data" as const, data: { jwt } }],
  }
}

/** A signed message with text content and a signature in metadata. */
export function signedMessage(text = "hello", sig = "valid.jwt.signature") {
  return {
    kind: "message" as const,
    messageId: "msg-1",
    role: "user" as const,
    parts: [{ kind: "text" as const, text }],
    metadata: { sig },
  }
}

/** A message with no signature — for testing rejection of unsigned input. */
export function unsignedMessage(text = "hello") {
  return {
    kind: "message" as const,
    messageId: "msg-1",
    role: "user" as const,
    parts: [{ kind: "text" as const, text }],
  }
}

/**
 * The expected JWT payload for a signed message with the given text.
 * Derives from the same shape as signedMessage() so they can't drift apart.
 */
export function expectedSignedPayload(text = "hello") {
  const { metadata: _, ...content } = signedMessage(text)
  return { message: content }
}

// --- Mock factories ---

/** Builds a JwtVerified result with sensible defaults, overriding only the payload. */
export function mockVerifiedJwt(payload: Record<string, unknown>): JwtVerified {
  return {
    verified: true,
    payload: { iss: "did:web:issuer.example.com", ...payload },
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
