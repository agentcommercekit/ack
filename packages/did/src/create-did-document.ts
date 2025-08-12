import { encodePublicKeyFromKeypair } from "@agentcommercekit/keys"
import {
  base58ToBytes,
  bytesToMultibase,
  hexStringToBytes
} from "@agentcommercekit/keys/encoding"
import type { DidDocument } from "./did-document"
import type { DidUri } from "./did-uri"
import type {
  KeyCurve,
  Keypair,
  PublicKeyEncoding,
  PublicKeyTypeMap,
  PublicKeyWithEncoding
} from "@agentcommercekit/keys"
import type { VerificationMethod } from "did-resolver"

type LegacyPublicKeyEncoding = "hex" | "base58"

type DidDocumentPublicKey = {
  [E in Exclude<PublicKeyEncoding, LegacyPublicKeyEncoding>]: {
    encoding: E
    curve: KeyCurve
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
  publicKey: publicKeyWithEncoding
}: CreateVerificationMethodOptions): VerificationMethod {
  const { encoding, value: publicKey } = convertLegacyPublicKeyToMultibase(
    publicKeyWithEncoding
  )

  const verificationMethod: VerificationMethod = {
    id: `${did}#${encoding}-1`,
    type: "Multikey",
    controller: did
  }

  // Add public key in the requested format
  switch (encoding) {
    case "jwk":
      verificationMethod.type = "JsonWebKey2020"
      verificationMethod.publicKeyJwk = publicKey
      break
    case "multibase":
      verificationMethod.type = "Multikey"
      verificationMethod.publicKeyMultibase = publicKey
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
        curve: publicKey.curve,
        value: bytesToMultibase(hexStringToBytes(publicKey.value))
      }
    case "base58":
      return {
        encoding: "multibase",
        curve: publicKey.curve,
        value: bytesToMultibase(base58ToBytes(publicKey.value))
      }
    default:
      return publicKey
  }
}

/**
 * Base options for creating a DID document
 */
export type CreateDidDocumentOptions = {
  /**
   * The DID to include in the DID document
   */
  did: DidUri
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
   * CapabilityDelegation verification method
   */
  capabilityDelegation?: string[]
  /**
   * CapabilityInvocation verification method
   */
  capabilityInvocation?: string[]
} & (
  | {
      /**
       * The public key to include in the DID document
       */
      publicKey: PublicKeyWithEncoding
      /**
       * Optional verification method to use instead of building one
       */
      verificationMethod?: never
    }
  | {
      /**
       * The public key to include in the DID document (not required when verificationMethod is provided)
       */
      publicKey?: never
      /**
       * Verification method to use instead of building one from publicKey
       */
      verificationMethod: VerificationMethod
    }
)

/**
 * Create a DID document from a public key
 *
 * @param options - The {@link CreateDidDocumentOptions} to use
 * @returns A {@link DidDocument}
 *
 * @example
 * ```ts
 * const document = createDidDocument({
 *   did: "did:example:123",
 *   publicKey: {
 *     encoding: "jwk",
 *     curve: "Ed25519",
 *     value: {
 *       kty: "OKP",
 *       crv: "Ed25519",
 *       x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * ```ts
 * const document2 = createDidDocument({
 *   did: "did:example:123",
 *   verificationMethod: {
 *     id: "did:example:123#key-1",
 *     type: "Multikey",
 *     controller: "did:example:123",
 *     publicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
 *   }
 * })
 * ```
 */
export function createDidDocument({
  did,
  publicKey,
  controller,
  alsoKnownAs,
  service,
  additionalContexts,
  verificationMethod,
  capabilityDelegation,
  capabilityInvocation
}: CreateDidDocumentOptions): DidDocument {
  if (!verificationMethod) {
    // If no verification method is provided, we need to create one from the
    // public key
    if (!publicKey) {
      throw new Error("Either publicKey or verificationMethod must be provided")
    }

    verificationMethod ??= createVerificationMethod({
      did,
      publicKey
    })
  }

  const contexts = ["https://www.w3.org/ns/did/v1"]
  if (verificationMethod.type === "Multikey") {
    contexts.push("https://w3id.org/security/multikey/v1")
  } else if (
    verificationMethod.type === "JsonWebKey2020" ||
    verificationMethod.type === "JsonWebKey"
  ) {
    contexts.push("https://w3id.org/security/jwk/v1")
  }
  contexts.push(...(additionalContexts ?? []))

  const document: DidDocument = {
    "@context": contexts,
    id: did,
    verificationMethod: [verificationMethod],
    authentication: [verificationMethod.id],
    assertionMethod: [verificationMethod.id],
    ...(controller && { controller }),
    ...(alsoKnownAs && { alsoKnownAs }),
    ...(service && { service }),
    ...(capabilityDelegation && { capabilityDelegation }),
    ...(capabilityInvocation && { capabilityInvocation })
  }

  return document
}

export type CreateDidDocumentFromKeypairOptions = Omit<
  CreateDidDocumentOptions,
  "publicKey" | "verificationMethod"
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
