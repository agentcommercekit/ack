import { buildUrl } from "@/lib/build-url"
import { getIdentity, type Identity } from "@/lib/identity"
import type { Env, MiddlewareHandler } from "hono"
import { env } from "hono/adapter"

declare module "hono" {
  interface ContextVariableMap {
    identities: {
      agent: Identity
      controller: Identity
    }
  }
}

export function identities(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const { AGENT_PRIVATE_KEY, CONTROLLER_PRIVATE_KEY, HOSTNAME, PORT } = env(c)

    const controller = await getIdentity({
      baseUrl: buildUrl(HOSTNAME, PORT, "/controller"),
      privateKey: CONTROLLER_PRIVATE_KEY,
      curve: "Ed25519",
    })

    const agent = await getIdentity({
      baseUrl: buildUrl(HOSTNAME, PORT, "/agent"),
      privateKey: AGENT_PRIVATE_KEY,
      controller: controller.did,
      curve: "secp256k1",
    })

    c.set("identities", {
      agent,
      controller,
    })

    await next()
  }
}
