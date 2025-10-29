import {
  createDidDocument,
  createDidDocumentFromKeypair,
  type CreateDidDocumentFromKeypairOptions,
  type CreateDidDocumentOptions
} from "../create-did-document"
import type { DidUri } from "../did-uri"
import type { DidUriWithDocument } from "../types"

/**
 * The type of a local Did
 */
export type DidWebUri = DidUri<"web">

// Utility type to distribute Omit over unions
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never

/**
 * Create a did:web from a url
 *
 * @param input - The url or url string to create a did:web from
 * @returns The did:web
 */
export function createDidWebUri(input: string | URL): DidWebUri {
  const url = new URL(input)
  const hostname = url.hostname
  let path = url.pathname

  // Remove leading and trailing slashes from path
  path = path.replace(/^\/|\/$/g, "")

  // Replace slashes with colons in the path
  path = path.replace(/\//g, ":")

  // URL encode the port colon if present
  let portPart = ""
  if (url.port) {
    portPart = `%3A${url.port}`
  }

  // Combine all parts
  if (path) {
    return `did:web:${hostname}${portPart}:${path}`
  } else {
    return `did:web:${hostname}${portPart}`
  }
}

type CreateDidWebDocumentParams = {
  baseUrl: string
} & DistributiveOmit<CreateDidDocumentOptions, "did">

/**
 * Create a did:web document
 *
 * @param options - The {@link CreateDidDocumentOptions} to use
 * @returns A {@link DidUriWithDocument}
 */
export function createDidWebDocument({
  baseUrl,
  ...options
}: CreateDidWebDocumentParams): DidUriWithDocument<DidWebUri> {
  const did = createDidWebUri(baseUrl)
  const didDocument = createDidDocument({
    did,
    ...options
  })

  return {
    did,
    didDocument
  }
}

type CreateDidWebDocumentFromKeypairParams = Omit<
  CreateDidDocumentFromKeypairOptions,
  "did"
> & {
  baseUrl: string
}

/**
 * Create a did:web document from a Keypair
 *
 * @param options - The {@link CreateDidDocumentFromKeypairOptions} to use
 * @returns A {@link DidUriWithDocument}
 */
export function createDidWebDocumentFromKeypair({
  baseUrl,
  ...options
}: CreateDidWebDocumentFromKeypairParams): DidUriWithDocument<DidWebUri> {
  const did = createDidWebUri(baseUrl)
  const didDocument = createDidDocumentFromKeypair({
    did,
    ...options
  })

  return {
    did,
    didDocument
  }
}

export function isDidWebUri(did: unknown): did is DidWebUri {
  return typeof did === "string" && did.startsWith("did:web:")
}
