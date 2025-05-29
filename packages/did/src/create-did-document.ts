import { encodePublicKeyFromKeypair } from "@agentcommercekit/keys"
import {
  base58ToBytes,
  bytesToMultibase,
  hexStringToBytes
} from "@agentcommercekit/keys/encoding"
import type { DidDocument } from "./did-document"
import type { DidUri } from "./did-uri"
import type {
  Keypair,
  KeypairAlgorithm,
  PublicKeyEncoding,
  PublicKeyTypeMap,
  PublicKeyWithEncoding
} from "@agentcommercekit/keys"
import type { VerificationMethod } from "did-resolver"

/**
 * Combined verification method configuration
 */
export const keyConfig = {
  secp256k1: {
    type: "EcdsaSecp256k1VerificationKey2019",
    context: ["https://w3id.org/security#EcdsaSecp256k1VerificationKey2019"]
  },
  Ed25519: {
    type: "Ed25519VerificationKey2018",
    context: ["https://w3id.org/security#Ed25519VerificationKey2018"]
  }
} as const

type LegacyPublicKeyEncoding = "hex" | "base58"

type DidDocumentPublicKey = {
  [E in Exclude<PublicKeyEncoding, LegacyPublicKeyEncoding>]: {
    encoding: E
    algorithm: KeypairAlgorithm
    value: PublicKeyTypeMap[E]
  }
}[Exclude<PublicKeyEncoding, LegacyPublicKeyEncoding>]

interface CreateVerificationMethodOptions {
  did: DidUri
  publicKey: PublicKeyWithEncoding
}

/**
 * Build a verification method from options
 */
export function createVerificationMethod({
  did,
  publicKey
}: CreateVerificationMethodOptions): VerificationMethod {
  const { encoding, algorithm, value } =
    convertLegacyPublicKeyToMultibase(publicKey)

  const verificationMethod: VerificationMethod = {
    id: `${did}#${encoding}-1`,
    type: keyConfig[algorithm].type,
    controller: did
  }

  // Add public key in the requested format
  switch (encoding) {
    case "jwk":
      verificationMethod.publicKeyJwk = value
      break
    case "multibase":
      verificationMethod.publicKeyMultibase = value
      break
  }

  return verificationMethod
}

function convertLegacyPublicKeyToMultibase(
  publicKey: PublicKeyWithEncoding
): DidDocumentPublicKey {
  switch (publicKey.encoding) {
    case "hex":
      return {
        encoding: "multibase",
        algorithm: publicKey.algorithm,
        value: bytesToMultibase(hexStringToBytes(publicKey.value))
      }
    case "base58":
      return {
        encoding: "multibase",
        algorithm: publicKey.algorithm,
        value: bytesToMultibase(base58ToBytes(publicKey.value))
      }
    default:
      return publicKey
  }
}

/**
 * Base options for creating a DID document
 */
export interface CreateDidDocumentOptions {
  /**
   * The DID to include in the DID document
   */
  did: DidUri
  /**
   * The public key to include in the DID document
   */
  publicKey: PublicKeyWithEncoding

  /**
   * Additional URIs that are equivalent to this DID
   */
  alsoKnownAs?: string[]
  /**
   * The controller of the DID document
   */
  controller?: DidUri
  /**
   * Services associated with the DID
   */
  service?: DidDocument["service"]
  /**
   * Additional contexts to include in the DID document
   */
  additionalContexts?: string[]
  /**
   * Optional verification method to use instead of building one
   */
  verificationMethod?: VerificationMethod
}

/**
 * Create a DID document from a public key
 *
 * @param options - The {@link CreateDidDocumentOptions} to use
 * @returns A {@link DidDocument}
 */
export function createDidDocument({
  did,
  publicKey,
  controller,
  alsoKnownAs,
  service,
  additionalContexts,
  verificationMethod
}: CreateDidDocumentOptions): DidDocument {
  verificationMethod ??= createVerificationMethod({
    did,
    publicKey
  })

  const contexts = [
    "https://www.w3.org/ns/did/v1",
    ...keyConfig[publicKey.algorithm].context,
    ...(additionalContexts ?? [])
  ]

  const document: DidDocument = {
    "@context": contexts,
    id: did,
    verificationMethod: [verificationMethod],
    authentication: [verificationMethod.id],
    assertionMethod: [verificationMethod.id]
  }

  if (controller) {
    document.controller = controller
  }

  if (alsoKnownAs) {
    document.alsoKnownAs = alsoKnownAs
  }

  if (service) {
    document.service = service
  }

  return document
}

export type CreateDidDocumentFromKeypairOptions = Omit<
  CreateDidDocumentOptions,
  "publicKey"
> & {
  /**
   * The keypair to create the did document from
   */
  keypair: Keypair
  /**
   * The encoding of the public key
   */
  encoding?: PublicKeyEncoding
}

/**
 * Create a DID document from a Keypair
 *
 * @param options - The {@link CreateDidDocumentFromKeypairOptions} to use
 * @returns A {@link DidDocument}
 */
export function createDidDocumentFromKeypair({
  keypair,
  encoding = "jwk",
  ...options
}: CreateDidDocumentFromKeypairOptions): DidDocument {
  return createDidDocument({
    ...options,
    publicKey: encodePublicKeyFromKeypair(encoding, keypair)
  })
}
