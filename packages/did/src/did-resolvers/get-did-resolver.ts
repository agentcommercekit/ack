import type { ResolverOptions } from "did-resolver"
import { getResolver as getJwksDidResolver } from "jwks-did-resolver"
import { getResolver as getKeyDidResolver } from "key-did-resolver"

import { DidResolver } from "./did-resolver"
import { getResolver as getPkhDidResolver } from "./pkh-did-resolver"
import {
  getResolver as getWebDidResolver,
  type DidWebResolverOptions,
} from "./web-did-resolver"

interface GetDidResolverOptions extends ResolverOptions {
  /**
   * The options for the did:web resolver
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
  const keyResolver = getKeyDidResolver()
  const webResolver = getWebDidResolver(webOptions)
  // did-jwks calls fetch with no init, so inject the redirect policy here
  const jwksResolver = getJwksDidResolver({
    ...webOptions,
    fetch: (input, init) =>
      webFetch(input, {
        ...init,
        redirect: webOptions.followRedirects ? "follow" : "manual",
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
