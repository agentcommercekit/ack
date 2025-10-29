import type { Issuer } from "@/lib/types"
import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  hexStringToBytes
} from "agentcommercekit"
import type { Env, MiddlewareHandler } from "hono"
import { env } from "hono/adapter"

declare module "hono" {
  interface ContextVariableMap {
    issuer: Issuer
  }
}

export function issuer(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const { ISSUER_PRIVATE_KEY, BASE_URL } = env(c)

    const privateKeyBytes = hexStringToBytes(ISSUER_PRIVATE_KEY)
    const keypair = await generateKeypair("secp256k1", privateKeyBytes)

    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair,
      baseUrl: BASE_URL
    })

    const signer = createJwtSigner(keypair)

    c.set("issuer", {
      did,
      didDocument,
      signer,
      alg: "ES256K"
    })

    await next()
  }
}
