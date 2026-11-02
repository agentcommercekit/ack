import type { ResolverOptions } from "did-resolver"
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
  const jwksResolver = getJwksDidResolver({
    ...webOptions,
    fetch: (input, init) =>
      webFetch(input, {
        ...init,
        redirect: webOptions.followRedirects ? "follow" : "manual",
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(timeout)])
          : AbortSignal.timeout(timeout),
      }),
  })
  const pkhResolver = getPkhDidResolver()

  const didResolver = new DidResolver(
    {
      ...keyResolver,
      ...webResolver,
      ...jwksResolver,
      ...pkhResolver,
    },
    options,
  )

  return didResolver
}
