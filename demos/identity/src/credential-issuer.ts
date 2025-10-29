import {
  createControllerCredential,
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  parseJwtCredential,
  signCredential,
  verifyJwt,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtString,
  type Keypair,
  type Verifiable,
  type W3CCredential,
} from "agentcommercekit"
import { didUriSchema } from "agentcommercekit/schemas/valibot"
import * as v from "valibot"

interface CredentialIssuerParams {
  baseUrl: string
  resolver: DidResolver
  keypair: Keypair
}

const credentialPayloadSchema = v.object({
  controller: didUriSchema,
  subject: didUriSchema,
})

export class CredentialIssuer {
  readonly did: DidUri
  readonly didDocument: DidDocument
  private readonly keypair: Keypair
  private readonly signer
  private readonly baseUrl: string
  private readonly resolver: DidResolver

  static async create(
    params: Omit<CredentialIssuerParams, "keypair">,
  ): Promise<CredentialIssuer> {
    const keypair = await generateKeypair("secp256k1")
    return new this({ ...params, keypair })
  }

  constructor({ baseUrl, resolver, keypair }: CredentialIssuerParams) {
    // Base URL
    this.baseUrl = baseUrl

    // Keypair
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)

    // Did Document
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair: this.keypair,
      baseUrl: this.baseUrl,
    })
    this.did = did
    this.didDocument = didDocument

    // Resolver
    this.resolver = resolver
    this.resolver.addToCache(this.did, this.didDocument)
  }

  async issueAgentOwnershipVc(
    signedPayload: JwtString,
  ): Promise<Verifiable<W3CCredential>> {
    const parsed = await verifyJwt(signedPayload, {
      resolver: this.resolver,
      policies: {
        aud: false,
      },
    })

    const { controller, subject } = v.parse(
      credentialPayloadSchema,
      parsed.payload,
    )

    const id = `${this.baseUrl}/credentials/${parsed.payload.id}`
    const credential = createControllerCredential({
      id,
      subject,
      controller,
      issuer: this.did,
    })

    const jwt = await signCredential(credential, {
      did: this.did,
      signer: this.signer,
      alg: "ES256K",
    })

    const verifiableCredential = await parseJwtCredential(jwt, this.resolver)

    return verifiableCredential
  }
}
