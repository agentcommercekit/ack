/**
 * This is a did:web resolver that is a drop-in replacement for the `web`
 * resolver from the `web-did-resolver` package, but provides additional checks
 * and more control for fetching and resolution.
 *
 * The error messages should match exactly with the `web` resolver from the
 * `web-did-resolver` package.
 *
 * @see {@link https://github.com/decentralized-identity/web-did-resolver}
 * @see {@link ../../licenses/web-did-resolver.LICENSE}
 */
import type {
  DIDDocument,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
} from "did-resolver"
import {
  isDidDocument,
  isDidDocumentForDid,
  type DidDocument,
} from "../did-document"
import { isDidWebUri } from "../methods/did-web"

type Fetch = typeof globalThis.fetch

export interface DidWebResolverOptions {
  /**
   * The path to the did.json file.
   *
   * @default "/.well-known/did.json"
   */
  docPath?: string
  /**
   * The fetch function to use.
   *
   * @default globalThis.fetch
   */
  fetch?: Fetch
  /**
   * The hosts that are allowed to be used via `http`. All other hosts will
   * require `https`.
   *
   * @default []
   */
  allowedHttpHosts?: string[]
}

const DEFAULT_ALLOWED_HTTP_HOSTS: string[] = []
const DEFAULT_DOC_PATH = "/.well-known/did.json"

/**
 * Get a did document from a url and validate that it is a DidDocument
 *
 * @throws If the response is not ok or the did document is invalid
 * @returns The did document
 */
async function fetchDidDocumentAtUrl(
  url: string | URL,
  { fetch = globalThis.fetch }: { fetch?: Fetch } = {},
): Promise<DidDocument> {
  const res = await fetch(url, { mode: "cors" })

  if (!res.ok) {
    throw new Error(
      `DID must resolve to a valid https URL containing a JSON document: Bad response ${res.statusText}`,
    )
  }

  const json = (await res.json()) as unknown

  if (!isDidDocument(json)) {
    throw new Error(
      "DID must resolve to a valid https URL containing a JSON document: Invalid JSON DID document",
    )
  }

  return json
}

/**
 * Check if a path is allowed to be used via http
 *
 * @returns True if the did is allowed to be used via http, false otherwise
 */
function isHttpAllowed(path: string, allowedHttpHosts: string[] = []): boolean {
  const [host] = path.split("/")

  if (host) {
    const [hostWithoutPort] = host.split(":")
    return allowedHttpHosts.some((host) => host === hostWithoutPort)
  }

  return false
}

/**
 * Build a did path from a full did string, including `did:web`
 *
 * @returns The path to the did document
 */
function buildDidPath(did: string, docPath: string = DEFAULT_DOC_PATH): string {
  if (!isDidWebUri(did)) {
    throw new Error("Invalid did:web DID")
  }

  const parts = did.replace("did:web:", "").split(":")
  const decodedParts = parts.map(decodeURIComponent)
  const [host, ...path] = decodedParts

  if (!host) {
    throw new Error("Invalid did:web DID")
  }

  if (path.length === 0) {
    return `${host}${docPath}`
  }

  return `${host}/${path.join("/")}/did.json`
}

/**
 * Get the content type for a did document
 *
 * @returns The content type for the did document
 */
function getContentType(didDocument: DidDocument): string {
  return didDocument["@context"]
    ? "application/did+ld+json"
    : "application/did+json"
}

/**
 * Get a resolver for did:web
 *
 * @returns A resolver for did:web
 */
export function getResolver({
  docPath = DEFAULT_DOC_PATH,
  fetch = globalThis.fetch,
  allowedHttpHosts = DEFAULT_ALLOWED_HTTP_HOSTS,
}: DidWebResolverOptions = {}): { web: DIDResolver } {
  async function resolve(
    did: string,
    parsed: ParsedDID,
  ): Promise<DIDResolutionResult> {
    const path = buildDidPath(parsed.did, docPath)
    const url = isHttpAllowed(path, allowedHttpHosts)
      ? `http://${path}`
      : `https://${path}`

    const didDocumentMetadata = {}
    let didDocument: DIDDocument | null = null

    try {
      didDocument = await fetchDidDocumentAtUrl(url, { fetch })

      if (!isDidDocumentForDid(didDocument, did)) {
        throw new Error("DID document id does not match requested did")
      }
    } catch (error) {
      return {
        didDocument,
        didDocumentMetadata,
        didResolutionMetadata: {
          error: "notFound",
          message: `resolver_error: ` + (error as Error).message,
        },
      }
    }

    return {
      didDocument,
      didDocumentMetadata,
      didResolutionMetadata: { contentType: getContentType(didDocument) },
    }
  }

  return { web: resolve }
}
