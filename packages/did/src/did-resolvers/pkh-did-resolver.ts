/**
 * A `did:pkh` resolver for use with `did-resolver`
 */
import type { DIDResolutionResult, DIDResolver } from "did-resolver"

import {
  createDidPkhDocumentFromDidPkhUri,
  isDidPkhUri,
} from "../methods/did-pkh"

export async function resolve(did: string): Promise<DIDResolutionResult> {
  if (!isDidPkhUri(did)) {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error: "invalidDid" },
    }
  }

  const { didDocument } = createDidPkhDocumentFromDidPkhUri(did)

  return Promise.resolve({
    didDocument,
    didDocumentMetadata: {},
    didResolutionMetadata: { contentType: "application/did+ld+json" },
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
