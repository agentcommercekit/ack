import {
  createDidWebDocumentFromKeypair,
  createDidWebUri,
  type DidDocument,
  type DidUri
} from "@agentcommercekit/did"
import {
  createJwtSigner,
  curveToJwtAlgorithm,
  type JwtAlgorithm,
  type JwtSigner
} from "@agentcommercekit/jwt"
import { generateKeypair, type KeyCurve } from "@agentcommercekit/keys"
import { hexStringToBytes } from "@agentcommercekit/keys/encoding"

export interface Identity {
  did: DidUri
  didDocument: DidDocument
  signer: JwtSigner
  alg: JwtAlgorithm
}

export function getIdentityDid(baseUrl: string): DidUri {
  return createDidWebUri(baseUrl)
}

interface GetIdentityOptions {
  baseUrl: string
  privateKey: `0x${string}`
  controller?: DidUri
  curve?: KeyCurve
}

export async function getIdentity({
  baseUrl,
  privateKey,
  controller,
  curve = "secp256k1"
}: GetIdentityOptions): Promise<Identity> {
  const keypair = await generateKeypair(curve, hexStringToBytes(privateKey))
  const signer = createJwtSigner(keypair)

  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl,
    controller
  })

  return {
    did,
    didDocument,
    signer,
    alg: curveToJwtAlgorithm(curve)
  }
}
