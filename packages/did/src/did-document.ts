import type { DIDDocument as DidDocument, Service } from "did-resolver"

export type { DidDocument, Service }

/**
 * Check if a value is a did document
 *
 * @param didDocument - The value to check
 * @returns True if the value is a did document, false otherwise
 */
export function isDidDocument(
  didDocument: unknown
): didDocument is DidDocument {
  return (
    typeof didDocument === "object" &&
    didDocument !== null &&
    "id" in didDocument
  )
}

/**
 * Check if a did document is for a specific did
 *
 * @param didDocument - The did document to check
 * @param did - The did to check against
 * @returns True if the did document is for the specific did, false otherwise
 */
export function isDidDocumentForDid(
  didDocument: DidDocument,
  did: string
): boolean {
  return didDocument.id === did
}
