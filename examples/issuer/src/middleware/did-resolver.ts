import type { Env, MiddlewareHandler } from "hono"

import { getDidResolver, type DidResolver } from "agentcommercekit"

declare module "hono" {
  interface ContextVariableMap {
    resolver: DidResolver
  }
}

export function didResolver(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const issuer = c.get("issuer")
    const resolver = getDidResolver()
    // There are certain points where we need to resolve our own DID (when we parse a JWT that we signed, for example).
    // However, CF workers cannot invoke themselves, so an attempt to resolve our own DID will fail. To get around this,
    // we pre-populate the cache with our own DID document.
    resolver.addToCache(issuer.did, issuer.didDocument)
    c.set("resolver", resolver)

    await next()
  }
}
