import { getDidResolver } from "@agentcommercekit/did"
import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import { verifyJwt } from "@agentcommercekit/jwt"
import { credentialSchema } from "@agentcommercekit/vc/schemas/valibot"
import { stringify } from "safe-stable-stringify"
import * as v from "valibot"
import { dataPartSchema, messageSchema } from "./schemas/valibot"
import type { Message } from "@a2a-js/sdk"
import type { DidResolver, DidUri } from "@agentcommercekit/did"
import type { JwtVerified } from "@agentcommercekit/jwt"

const jwtDataPartSchema = v.object({
  ...dataPartSchema.entries,
  data: v.object({
    jwt: v.string()
  })
})

const messageWithJwtSchema = v.looseObject({
  ...messageSchema.entries,
  parts: v.tuple([jwtDataPartSchema])
})

const messageWithSignatureSchema = v.looseObject({
  ...messageSchema.entries,
  metadata: v.looseObject({
    sig: v.string()
  })
})

const handshakePayloadSchema = v.object({
  iss: didUriSchema,
  nonce: v.string(),
  vc: credentialSchema
})

type VerifyA2AHandshakeOptions = {
  did: DidUri
  counterparty?: DidUri
  resolver?: DidResolver
}

export async function verifyA2AHandshakeMessage(
  message: Message | null,
  { did, counterparty, resolver = getDidResolver() }: VerifyA2AHandshakeOptions
): Promise<v.InferOutput<typeof handshakePayloadSchema>> {
  // Ensure the message is a valid A2A handshake message
  const parsedMessage = v.parse(messageWithJwtSchema, message)
  const jwt = parsedMessage.parts[0].data.jwt

  const verified = await verifyJwt(jwt, {
    audience: did,
    issuer: counterparty,
    resolver
  })

  return v.parse(handshakePayloadSchema, verified.payload)
}

export async function verifyA2ASignedMessage(
  message: Message,
  { did, counterparty, resolver = getDidResolver() }: VerifyA2AHandshakeOptions
): Promise<JwtVerified> {
  // Ensure the message is a valid A2A signed message
  const {
    metadata,
    contextId: _contextId,
    ...parsedMessage
  } = v.parse(messageWithSignatureSchema, message)

  // Parse the signature from the message metadata, ensuring it is
  // signed by the counterparty and intended for the provided DID
  const verified = await verifyJwt(metadata.sig, {
    audience: did,
    issuer: counterparty,
    resolver
  })

  const stringifiedMessage = stringify(parsedMessage)
  const stringifiedVerified = stringify(verified.payload.message)

  // Verify the provided message matches the message in the signature
  // NOTE: the message signature contains the message without the top-level metadata
  if (stringifiedMessage !== stringifiedVerified) {
    throw new Error("Message parts do not match")
  }

  return verified
}
