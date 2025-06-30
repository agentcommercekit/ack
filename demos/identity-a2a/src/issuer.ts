import {
  createControllerCredential,
  createDidDocumentFromKeypair,
  createDidKeyUri,
  createJwtSigner,
  generateKeypair,
  getDidResolver,
  signCredential
} from "agentcommercekit"
import type { DidUri } from "agentcommercekit"

const issuerKeypair = await generateKeypair("Ed25519")

export const issuerDid = createDidKeyUri(issuerKeypair)
export const issuerDidDocument = createDidDocumentFromKeypair({
  did: issuerDid,
  keypair: issuerKeypair
})

const signer = createJwtSigner(issuerKeypair)

const resolver = getDidResolver()
resolver.addToCache(issuerDid, issuerDidDocument)

export const didResolverWithIssuer = resolver

export async function issueCredential({
  subject,
  controller
}: {
  subject: DidUri
  controller: DidUri
}) {
  const credential = createControllerCredential({
    subject,
    controller,
    issuer: issuerDid
  })

  const { verifiableCredential } = await signCredential(credential, {
    did: issuerDid,
    signer,
    alg: "EdDSA",
    resolver
  })

  return verifiableCredential
}
