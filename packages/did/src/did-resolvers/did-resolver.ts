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
 * Default TTL for cached DID resolution results: 5 minutes.
 *
 * A stale cached document (e.g. one whose keys have since been rotated or
 * revoked) would continue to pass every signature and issuer check until the
 * process restarts or the cache is manually cleared. The TTL bounds that window
 * without forcing a network round-trip on every verification.
 *
 * Callers that need a different policy can pass `cacheTtlMs` to the
 * constructor, set it to `Infinity` to restore the old unlimited behaviour, or
 * set it to `0` to disable caching entirely (equivalent to `cache: false`).
 */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  result: DIDResolutionResult
  cachedAt: number
}

export interface DidResolverOptions extends ResolverOptions {
  /**
   * How long (in milliseconds) a cached DID resolution result is considered
   * fresh. Defaults to 5 minutes. Pass `Infinity` to disable expiry (the
   * previous behaviour). Pass `0` to disable caching entirely.
   */
  cacheTtlMs?: number
}

/**
 * This is a wrapper around the did-resolver that allows for pre-caching of
 * DidDocuments. The did-resolver class already had a post-resolution cache,
 * and this class extends it to allow for pre-resolution caching with a
 * configurable TTL so stale documents (rotated or revoked keys) do not stay
 * cached indefinitely.
 */
export class DidResolver extends Resolver {
  #cache = new Map<string, CacheEntry>()
  #useCache = true
  #cacheTtlMs: number

  constructor(
    registry: ResolverRegistry = {},
    options: DidResolverOptions = {},
  ) {
    super(registry, options)

    const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS

    if (options.cache === false || ttl === 0) {
      this.#useCache = false
      this.#cacheTtlMs = 0
    } else {
      this.#cacheTtlMs = ttl
    }
  }

  async resolve(
    didUrl: string,
    options: DIDResolutionOptions = {},
  ): Promise<DIDResolutionResult> {
    if (this.#useCache) {
      const entry = this.#cache.get(didUrl)
      if (entry !== undefined) {
        const ageMs = Date.now() - entry.cachedAt
        if (ageMs < this.#cacheTtlMs) {
          return Promise.resolve(entry.result)
        }
        // Entry is stale — evict it and fall through to a fresh resolution.
        this.#cache.delete(didUrl)
      }
    }

    return super.resolve(didUrl, options)
  }

  addResolutionResultToCache(
    did: string,
    resolutionResult: DIDResolutionResult,
  ) {
    if (this.#useCache) {
      this.#cache.set(did, { result: resolutionResult, cachedAt: Date.now() })
    }
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
