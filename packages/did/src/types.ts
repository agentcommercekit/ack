import type { DidDocument } from "./did-document"
import type { DidUri } from "./did-uri"

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

export interface DidUriWithDocument<T extends DidUri = DidUri> {
  did: T
  didDocument: DidDocument
}
