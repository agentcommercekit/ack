import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  curveToJwtAlgorithm,
  generateKeypair,
  hexStringToBytes
} from "agentcommercekit"

import type {
  DidDocument,
  DidUri,
  JwtAlgorithm,
  JwtSigner
} from "agentcommercekit"

// The DID that controls the server DID (hosted under /trusted)
export const trustedDid = "did:web:localhost%3A5000:trusted"

const privKey = process.env.SERVER_PRIVATE_KEY!
const controllerPrivKey = process.env.CONTROLLER_PRIVATE_KEY!

type ServerIdentity = {
  did: DidUri
  didDocument: DidDocument
  signer: JwtSigner
  alg: JwtAlgorithm
}

let _serverIdentity: ServerIdentity | null = null
let _controllerIdentity: ServerIdentity | null = null

export async function getServerIdentity(): Promise<ServerIdentity> {
  if (_serverIdentity) {
    return _serverIdentity
  }

  const keypair = await generateKeypair("Ed25519", hexStringToBytes(privKey))

  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl: "http://localhost:5000",
    controller: trustedDid
  })

  _serverIdentity = {
    did,
    didDocument,
    signer: createJwtSigner(keypair),
    alg: curveToJwtAlgorithm(keypair.curve)
  }

  return _serverIdentity
}

// Separate identity for the controller DID hosted at /trusted
export async function getControllerIdentity(): Promise<ServerIdentity> {
  if (_controllerIdentity) {
    return _controllerIdentity
  }

  const keypair = await generateKeypair(
    "Ed25519",
    hexStringToBytes(controllerPrivKey)
  )

  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl: "http://localhost:5000/trusted"
  })

  _controllerIdentity = {
    did,
    didDocument,
    signer: createJwtSigner(keypair),
    alg: curveToJwtAlgorithm(keypair.curve)
  }

  return _controllerIdentity
}
