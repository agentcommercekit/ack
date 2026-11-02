import type { DIDResolver, ResolverOptions } from "did-resolver"
import { getResolver as getJwksDidResolver } from "jwks-did-resolver"
import { getResolver as getKeyDidResolver } from "key-did-resolver"

import { DidResolver } from "./did-resolver"
import { getResolver as getPkhDidResolver } from "./pkh-did-resolver"
import {
  DEFAULT_TIMEOUT_MS,
  getResolver as getWebDidResolver,
  type DidWebResolverOptions,
} from "./web-did-resolver"

interface GetDidResolverOptions extends ResolverOptions {
  /**
   * The options for the did:web resolver. The did:jwks resolver shares
   * `fetch`, `allowedHttpHosts`, `followRedirects` and `timeout`.
   */
  webOptions?: DidWebResolverOptions
}

/**
 * Get a did resolver that can resolve multiple DID methods.
 *
 * @param options - The {@link GetDidResolverOptions} to use for the did resolver
 * @returns A new {@link DidResolver} instance
 */
export function getDidResolver({
  webOptions = {
    allowedHttpHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
  },
  ...options
}: GetDidResolverOptions = {}): DidResolver {
  const webFetch = webOptions.fetch ?? globalThis.fetch
  const timeout = webOptions.timeout ?? DEFAULT_TIMEOUT_MS
  const keyResolver = getKeyDidResolver()
  // Validates `timeout`, so the did:jwks fetches below can rely on it too.
  const webResolver = getWebDidResolver(webOptions)
  // did-jwks calls fetch with no init, so inject the redirect policy and the
  // timeout here. Each did:jwks resolution can fetch up to three URLs (the
  // JWKS, the OpenID configuration and its `jwks_uri`), and every one of them
  // targets a host named in the DID, so each is bounded like a did:web fetch.
  // The resolver is built per resolution so a timeout can be told apart from
  // other fetch failures.
  const resolveJwks: DIDResolver = async (
    did,
    parsed,
    resolver,
    resolveOptions,
  ) => {
    let timedOut = false
    const { jwks } = getJwksDidResolver({
      ...webOptions,
      fetch: (input, init) => {
        const timeoutSignal = AbortSignal.timeout(timeout)
        timeoutSignal.addEventListener(
          "abort",
          () => {
            timedOut = true
          },
          { once: true },
        )
        return webFetch(input, {
          ...init,
          redirect: webOptions.followRedirects ? "follow" : "manual",
          signal: init?.signal
            ? AbortSignal.any([init.signal, timeoutSignal])
            : timeoutSignal,
        })
      },
    })
    const result = await jwks(did, parsed, resolver, resolveOptions)
    // Report a timeout as `notFound`, like did:web does. did-resolver's cache
    // stores every other error, so an `internalError` here would keep a
    // transient timeout cached when `cache: true` is set.
    if (timedOut && result.didResolutionMetadata.error === "internalError") {
      return {
        ...result,
        didResolutionMetadata: {
          ...result.didResolutionMetadata,
          error: "notFound",
        },
      }
    }
    return result
  }
  const pkhResolver = getPkhDidResolver()

  const didResolver = new DidResolver(
    {
      ...keyResolver,
      ...webResolver,
      jwks: resolveJwks,
      ...pkhResolver,
    },
    options,
  )

  return didResolver
}
