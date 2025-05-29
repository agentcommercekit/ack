import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair
} from "agentcommercekit"
import type { DidResolver, DidUri, KeypairAlgorithm } from "agentcommercekit"

interface GenerateDidWebWithSignerOptions {
  controller?: DidUri
  algorithm?: KeypairAlgorithm
  /**
   * An optional DidResolver. If provided, the didDocument will be added to the cache.
   */
  resolver?: DidResolver
}

export async function createDidWebWithSigner(
  baseUrl: string,
  {
    controller,
    resolver,
    algorithm = "secp256k1"
  }: GenerateDidWebWithSignerOptions = {}
) {
  const keypair = await generateKeypair(algorithm)
  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl,
    controller,
    encoding: "jwk"
  })
  const signer = createJwtSigner(keypair)

  if (resolver) {
    resolver.addToCache(did, didDocument)
  }

  return {
    keypair,
    signer,
    did,
    didDocument
  }
}

export type DidWithSigner = Awaited<ReturnType<typeof createDidWebWithSigner>>
