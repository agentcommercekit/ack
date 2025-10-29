import {
  createControllerCredential,
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  signCredential,
  verifyJwt,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtString,
  type Keypair,
} from "agentcommercekit"
import { didUriSchema } from "agentcommercekit/schemas/valibot"
import * as v from "valibot"

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

  private constructor({
    baseUrl,
    keypair,
    resolver,
  }: {
    baseUrl: string
    keypair: Keypair
    resolver: DidResolver
  }) {
    // Base URL
    this.baseUrl = baseUrl

    // Keypair
    this.keypair = keypair
    this.signer = createJwtSigner(this.keypair)

    // Did Document
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair,
      baseUrl: this.baseUrl,
    })
    this.did = did
    this.didDocument = didDocument

    // Resolver
    this.resolver = resolver
    this.resolver.addToCache(this.did, this.didDocument)
  }

  static async create({
    baseUrl,
    resolver,
  }: {
    baseUrl: string
    resolver: DidResolver
  }): Promise<CredentialIssuer> {
    const keypair = await generateKeypair("secp256k1")
    return new CredentialIssuer({ baseUrl, keypair, resolver })
  }

  async issueAgentOwnershipVc(signedPayload: JwtString): Promise<JwtString> {
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

    return jwt
  }
}
