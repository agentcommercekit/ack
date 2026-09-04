import type { ResolverOptions } from "did-resolver"
import { getResolver as getJwksDidResolver } from "jwks-did-resolver"
import { getResolver as getKeyDidResolver } from "key-did-resolver"

import { DidResolver } from "./did-resolver"
import { getResolver as getPkhDidResolver } from "./pkh-did-resolver"
import { createPolicyEnforcedFetch } from "./url-policy"
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
  const webFetch = webOptions.fetch
  const keyResolver = getKeyDidResolver()
  const webResolver = getWebDidResolver(webOptions)
  const jwksResolver = getJwksDidResolver({
    ...webOptions,
    // `jwks-did-resolver`'s OIDC discovery fallback fetches a `jwks_uri` it
    // reads out of a discovery document - a target not derived from the DID
    // itself, unlike did:web's deterministic URL. Every fetch this resolver
    // makes (the direct jwks.json try, the discovery document, and the
    // discovered jwks_uri) goes through this one function, so wrapping it
    // here covers all three call sites uniformly.
    fetch: createPolicyEnforcedFetch(
      webFetch ? (input, init) => webFetch(input, init) : globalThis.fetch,
    ),
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
