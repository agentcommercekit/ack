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
import type { FetchLike } from "../types"

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
  fetch?: FetchLike
  /**
   * The hosts that are allowed to be used via `http`. All other hosts will
   * require `https`.
   *
   * @default []
   */
  allowedHttpHosts?: string[]
  /**
   * Milliseconds to wait for the DID document fetch before aborting. Must
   * be a positive integer of at most 2147483647 (the 32-bit timer limit).
   *
   * The timeout is applied via an `AbortSignal` on the request. A custom
   * `fetch` must honour `init.signal` for it to take effect.
   * @default 5000
   */
  timeout?: number
}

const DEFAULT_ALLOWED_HTTP_HOSTS: string[] = []
const DEFAULT_DOC_PATH = "/.well-known/did.json"
const MAX_TIMEOUT_MS = 2147483647

/**
 * Get a did document from a url and validate that it is a DidDocument
 *
 * @throws If the response is not ok or the did document is invalid
 * @returns The did document
 */
async function fetchDidDocumentAtUrl(
  url: string | URL,
  {
    fetch = globalThis.fetch,
    timeout,
  }: { fetch?: FetchLike; timeout?: number } = {},
): Promise<DidDocument> {
  const res = await fetch(url, {
    mode: "cors",
    ...(timeout !== undefined ? { signal: AbortSignal.timeout(timeout) } : {}),
  })

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
    return allowedHttpHosts.some(
      (allowedHost) => allowedHost === hostWithoutPort,
    )
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
  timeout = 5000,
}: DidWebResolverOptions = {}): { web: DIDResolver } {
  // Fail fast on a bad timeout rather than surfacing it later as a
  // misleading `notFound` resolution error. `AbortSignal.timeout` throws on
  // negative, non-integer or non-finite values; 0 is legal for the API but
  // would abort every request before it starts; and values beyond the
  // 32-bit timer range either clamp the timer to 1ms or throw at fetch
  // time, depending on the runtime.
  if (timeout <= 0 || timeout > MAX_TIMEOUT_MS || !Number.isInteger(timeout)) {
    throw new RangeError(
      "`timeout` must be a positive integer of at most 2147483647 milliseconds",
    )
  }

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
      didDocument = await fetchDidDocumentAtUrl(url, { fetch, timeout })

      if (!isDidDocumentForDid(didDocument, did)) {
        throw new Error("DID document id does not match requested did")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        didDocument,
        didDocumentMetadata,
        didResolutionMetadata: {
          error: "notFound",
          message: `resolver_error: ${message}`,
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
