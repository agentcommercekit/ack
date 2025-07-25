/**
 * A `did:pkh` resolver for use with `did-resolver`
 */
import {
  caip10AccountIdFromDidPkhUri,
  createDidPkhDocumentFromCaip10AccountId,
  isDidPkhUri
} from "../methods/did-pkh"
import type { DIDResolutionResult, DIDResolver } from "did-resolver"

export async function resolve(did: string): Promise<DIDResolutionResult> {
  if (!isDidPkhUri(did)) {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error: "invalidDid" }
    }
  }

  const caip10AccountId = caip10AccountIdFromDidPkhUri(did)
  const { didDocument } =
    createDidPkhDocumentFromCaip10AccountId(caip10AccountId)

  return Promise.resolve({
    didDocument,
    didDocumentMetadata: {},
    didResolutionMetadata: { contentType: "application/did+ld+json" }
  })
}

/**
 * Get a resolver for did:pkh
 *
 * @returns A resolver for did:pkh
 */
export function getResolver(): { pkh: DIDResolver } {
  return { pkh: resolve }
}
