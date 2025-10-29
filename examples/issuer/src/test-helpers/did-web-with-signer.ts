import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  type DidResolver,
  type DidUri,
  type KeyCurve,
} from "agentcommercekit"

interface GenerateDidWebWithSignerOptions {
  controller?: DidUri
  curve?: KeyCurve
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
    curve = "secp256k1",
  }: GenerateDidWebWithSignerOptions = {},
) {
  const keypair = await generateKeypair(curve)
  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl,
    controller,
    encoding: "jwk",
  })
  const signer = createJwtSigner(keypair)

  if (resolver) {
    resolver.addToCache(did, didDocument)
  }

  return {
    keypair,
    signer,
    did,
    didDocument,
  }
}

export type DidWithSigner = Awaited<ReturnType<typeof createDidWebWithSigner>>
