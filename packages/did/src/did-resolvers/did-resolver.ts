import {
  Resolver,
  type DIDResolutionOptions,
  type DIDResolutionResult,
  type ResolverOptions,
  type ResolverRegistry,
} from "did-resolver"

import type { DidDocument } from "../did-document"

export type { Resolvable } from "did-resolver"
/**
 * This is a wrapper around the did-resolver that allows for pre-caching of
 * DidDocuments.  The did-resolver class already had a post-resolution cache,
 * and this class extends it to allow for pre-resolution caching.
 */
export class DidResolver extends Resolver {
  #cache = new Map<string, DIDResolutionResult>()
  #useCache = true

  constructor(registry: ResolverRegistry = {}, options: ResolverOptions = {}) {
    super(registry, options)

    if (options.cache === false) {
      this.#useCache = false
    }
  }

  async resolve(
    didUrl: string,
    options: DIDResolutionOptions = {},
  ): Promise<DIDResolutionResult> {
    const cached = this.#cache.get(didUrl)
    if (this.#useCache && cached) {
      return Promise.resolve(cached)
    }

    return super.resolve(didUrl, options)
  }

  addResolutionResultToCache(
    did: string,
    resolutionResult: DIDResolutionResult,
  ) {
    this.#cache.set(did, resolutionResult)
    return this
  }

  addToCache(did: string, didDocument: DidDocument) {
    return this.addResolutionResultToCache(did, {
      didResolutionMetadata: {
        contentType: "application/did+json",
      },
      didDocument,
      didDocumentMetadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    })
  }

  removeFromCache(did: string) {
    this.#cache.delete(did)
    return this
  }

  clearCache() {
    this.#cache.clear()
  }
}
