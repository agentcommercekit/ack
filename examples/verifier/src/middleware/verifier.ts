import type { Env, MiddlewareHandler } from "hono"

import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  hexStringToBytes,
  type DidDocument,
  type DidUri,
  type JwtSigner,
} from "agentcommercekit"
import { env } from "hono/adapter"

declare module "hono" {
  interface ContextVariableMap {
    verifier: {
      /**
       * The Did of the issuer
       */
      did: DidUri
      /**
       * The Did document of the issuer
       */
      didDocument: DidDocument
      /**
       * The signer for this issuer
       */
      signer: JwtSigner
      /**
       * The algorithm used by the signer
       * @example "ES256K"
       */
      alg: string
    }
  }
}

export function verifier(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const { VERIFIER_PRIVATE_KEY, BASE_URL } = env(c)

    const keypair = await generateKeypair(
      "secp256k1",
      hexStringToBytes(VERIFIER_PRIVATE_KEY),
    )
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair,
      baseUrl: BASE_URL,
    })

    const signer = createJwtSigner(keypair)

    c.set("verifier", {
      did,
      didDocument,
      signer,
      alg: "ES256K",
    })

    await next()
  }
}
