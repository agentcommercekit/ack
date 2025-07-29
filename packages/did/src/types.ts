import type { DidDocument } from "./did-document"
import type { DidUri } from "./did-uri"

export interface DidUriWithDocument<T extends DidUri = DidUri> {
  did: T
  didDocument: DidDocument
}
