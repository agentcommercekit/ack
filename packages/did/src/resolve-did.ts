import type { Resolvable } from "did-resolver"
import { isDidUri } from "./did-uri"
import {
  DidDocumentNotFoundError,
  InvalidDidControllerError,
  InvalidDidUriError,
  UnsupportedDidMethodError,
} from "./errors"
import type { DidUriWithDocument } from "./types"

interface DidUriWithControlledDidDocument extends DidUriWithDocument {
  controller: DidUriWithDocument
}

/**
 * Resolve a DID document and return the DID and the document.
 *
 * @param didUri - The DID to resolve
 * @param resolver - The DID resolver to use
 * @returns The resolved DID document
 * @throws if the DID document cannot be resolved
 */
export async function resolveDid(
  didUri: string,
  resolver: Resolvable,
): Promise<DidUriWithDocument> {
  if (!isDidUri(didUri)) {
    throw new InvalidDidUriError(`Invalid DID URI format: ${didUri}`)
  }

  const result = await resolver.resolve(didUri)

  if (result.didResolutionMetadata.error === "unsupportedDidMethod") {
    throw new UnsupportedDidMethodError(`DID method not supported: ${didUri}`)
  }

  if (result.didResolutionMetadata.error === "notFound") {
    throw new DidDocumentNotFoundError(`DID document not found: ${didUri}`)
  }

  if (result.didResolutionMetadata.error === "invalidDid") {
    throw new InvalidDidUriError(`Invalid DID URI: ${didUri}`)
  }

  if (!result.didDocument) {
    throw new DidDocumentNotFoundError(
      `No DID document returned for: ${didUri}`,
    )
  }

  if (!isDidUri(result.didDocument.id)) {
    throw new InvalidDidUriError(
      `Invalid DID document ID format: ${result.didDocument.id}`,
    )
  }

  return {
    did: result.didDocument.id,
    didDocument: result.didDocument,
  }
}

/**
 * Resolve an agent's DID and its controller's DID, if it has one.
 *
 * @param did - The DID to resolve
 * @param resolver - The DID resolver to use
 * @returns The resolved DID document(s)
 * @throws if the DID document cannot be resolved or if controller is required but not found
 */
export async function resolveDidWithController(
  didUri: string,
  resolver: Resolvable,
): Promise<DidUriWithControlledDidDocument> {
  // Resolve the agent's DID document
  const { did, didDocument } = await resolveDid(didUri, resolver)

  if (!didDocument.controller) {
    throw new InvalidDidControllerError(`DID ${didUri} is missing a controller`)
  }

  // Check if the agent has a controller that can be resolved
  if (!isDidUri(didDocument.controller)) {
    throw new InvalidDidControllerError(
      `Controller of DID ${didUri} is not a valid DID: ${didDocument.controller}`,
    )
  }

  // Check if the agent is not controlling itself
  if (didDocument.controller === did) {
    throw new InvalidDidControllerError(
      `DID ${didUri} cannot be its own controller`,
    )
  }

  const controller = await resolveDid(didDocument.controller, resolver)

  return {
    did,
    didDocument,
    controller,
  }
}
