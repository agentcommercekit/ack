import { createJwt } from "@agentcommercekit/jwt"
import { v4 } from "uuid"
import { generateRandomJti, generateRandomNonce } from "./random"
import type { Message } from "@a2a-js/sdk"
import type { DidUri } from "@agentcommercekit/did"
import type {
  JwtAlgorithm,
  JwtPayload,
  JwtSigner,
  JwtString
} from "@agentcommercekit/jwt"
import type { W3CCredential } from "@agentcommercekit/vc"

type SignMessageOptions = {
  did: DidUri
  jwtSigner: JwtSigner
  alg?: JwtAlgorithm
  expiresIn?: number
}

type SignedA2AMessage = {
  sig: string
  jti: string
  message: Message
}

type A2AHandshakeMessage = SignedA2AMessage & {
  nonce: string
  replyNonce?: string
}

/**
 * Creates a signed A2A Message
 * @returns an object containing the signature, jti, and the signed message, with the signature added to the metadata
 */
export async function createSignedA2AMessage(
  { metadata, ...message }: Message,
  options: SignMessageOptions
): Promise<SignedA2AMessage> {
  // Sign everything in the message, excluding the metadata
  const { jwt: sig, jti } = await createMessageSignature({ message }, options)

  const metadataWithSig = {
    ...metadata,
    sig
  }

  return {
    sig,
    jti,
    message: {
      ...message,
      metadata: metadataWithSig
    }
  }
}

type A2AHandshakeParams = {
  /**
   * The recipient of the message
   */
  recipient: DidUri
  /**
   * The verifiable credential to include in the message
   */
  vc: W3CCredential
  /**
-   * The nonce of the message we're replying to, if any
-   */
  requestNonce?: string
}

export function createA2AHandshakePayload(params: A2AHandshakeParams) {
  const nonce = generateRandomNonce()
  const nonces = params.requestNonce
    ? {
        nonce: params.requestNonce,
        replyNonce: nonce
      }
    : {
        nonce: nonce
      }

  return {
    aud: params.recipient,
    ...nonces,
    vc: params.vc
  }
}

export function createA2AHandshakeMessageFromJwt(
  role: "agent" | "user",
  jwt: string
): Message {
  return {
    kind: "message" as const,
    messageId: v4(),
    role,
    parts: [
      {
        kind: "data" as const,
        data: {
          jwt
        }
      }
    ]
  }
}

/**
 * Creates a signed handshake message for A2A Authentication
 *
 * @returns An object containing signed A2A handshake message, as well as the newly generated nonce
 */
export async function createA2AHandshakeMessage(
  role: "agent" | "user",
  params: A2AHandshakeParams,
  signOptions: SignMessageOptions
) {
  const payload = createA2AHandshakePayload(params)

  const { jwt, jti } = await createMessageSignature(payload, signOptions)

  const message = createA2AHandshakeMessageFromJwt(role, jwt)

  return {
    sig: jwt,
    jti,
    nonce: payload.nonce,
    message
  }
}

async function createMessageSignature(
  payload: Partial<JwtPayload>,
  { did, jwtSigner, alg = "ES256K", expiresIn = 5 * 60 }: SignMessageOptions
): Promise<{ jwt: JwtString; jti: string }> {
  const jti = generateRandomJti()
  const jwt = await createJwt(
    {
      jti,
      ...payload
    },
    {
      expiresIn,
      signer: jwtSigner,
      issuer: did
    },
    {
      alg
    }
  )

  return { jwt, jti }
}
