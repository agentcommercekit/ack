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
  const keyResolver = getKeyDidResolver()
  const webResolver = getWebDidResolver(webOptions)
  const jwksResolver = getJwksDidResolver(webOptions)
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
