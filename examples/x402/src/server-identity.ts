/**
 * This file creates 2 identities for the server:
 * - The server's identity, which is used to sign Verifiable Credentials
 * - The controller's identity, which is used to sign Controller Credentials
 *
 * The server's DID document sets the controller DID as its controller.
 *
 * The controller DID is used to sign Controller Credentials that allow buyers
 * to verify the server's identity.
 */
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

const privKey = process.env.SERVER_PRIVATE_KEY!
const controllerPrivKey = process.env.CONTROLLER_PRIVATE_KEY!

type ServerIdentity = {
  did: DidUri
  didDocument: DidDocument
  signer: JwtSigner
  alg: JwtAlgorithm
}

// cache vars for the identities so we only generate them once
let _serverIdentity: ServerIdentity | null = null
let _controllerIdentity: ServerIdentity | null = null

/**
 * Returns the server's identity - the DID, DID Document, and signer
 */
export async function getServerIdentity(): Promise<ServerIdentity> {
  if (_serverIdentity) {
    return _serverIdentity
  }

  const keypair = await generateKeypair("Ed25519", hexStringToBytes(privKey))

  const { did: controllerDid } = await getControllerIdentity()

  const { did, didDocument } = createDidWebDocumentFromKeypair({
    keypair,
    baseUrl: "http://localhost:5000",
    controller: controllerDid
  })

  _serverIdentity = {
    did,
    didDocument,
    signer: createJwtSigner(keypair),
    alg: curveToJwtAlgorithm(keypair.curve)
  }

  return _serverIdentity
}

/**
 * Returns the controller's identity - the DID, DID Document, and signer
 */
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
