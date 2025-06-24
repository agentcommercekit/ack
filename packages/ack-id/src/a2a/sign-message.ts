import { createJwt } from "@agentcommercekit/jwt"
import { generateRandomJti, generateRandomNonce } from "./random"
import type { DidUri } from "@agentcommercekit/did"
import type {
  JwtAlgorithm,
  JwtPayload,
  JwtSigner,
  JwtString
} from "@agentcommercekit/jwt"
import type { Message, Role } from "a2a-js"

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

type A2AHandshakeOptions = SignMessageOptions & {
  /**
   * The nonce of the message we're replying to, if any
   */
  requestNonce?: string
}

export function createA2AHandshakePayload(
  recipient: DidUri,
  requestNonce?: string
) {
  const nonce = generateRandomNonce()
  const nonces = requestNonce
    ? {
        nonce: requestNonce,
        replyNonce: nonce
      }
    : {
        nonce: nonce
      }

  return {
    aud: recipient,
    ...nonces
  }
}

export function createA2AHandshakeMessageFromJwt(
  role: Role,
  jwt: string
): Message {
  return {
    role,
    parts: [
      {
        type: "data" as const,
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
  role: Role,
  recipient: DidUri,
  options: A2AHandshakeOptions
): Promise<A2AHandshakeMessage> {
  const nonce = generateRandomNonce()
  const nonces = options.requestNonce
    ? {
        nonce: options.requestNonce,
        replyNonce: nonce
      }
    : {
        nonce: nonce
      }

  const payload = {
    aud: recipient,
    ...nonces
  }

  const { jwt, jti } = await createMessageSignature(payload, options)

  const message: Message = {
    role,
    parts: [
      {
        type: "data",
        data: {
          jwt
        }
      }
    ]
  }

  return {
    sig: jwt,
    jti,
    nonce,
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
