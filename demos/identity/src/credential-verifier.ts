import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  generateKeypair,
  getControllerClaimVerifier,
  verifyParsedCredential,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtSigner,
  type Keypair,
  type W3CCredential
} from "agentcommercekit"

interface CredentialVerifierParams {
  baseUrl: string
  resolver: DidResolver
  trustedIssuers?: DidUri[]
  keypair: Keypair
}

export class CredentialVerifier {
  readonly did: DidUri
  readonly didDocument: DidDocument
  private readonly keypair: Keypair
  private readonly signer: JwtSigner
  private readonly resolver: DidResolver
  private readonly trustedIssuers?: DidUri[]

  static async create(
    params: Omit<CredentialVerifierParams, "keypair">
  ): Promise<CredentialVerifier> {
    const keypair = await generateKeypair("secp256k1")
    return new this({ ...params, keypair })
  }

  constructor({
    baseUrl,
    resolver,
    trustedIssuers,
    keypair
  }: CredentialVerifierParams) {
    // Keypair
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)

    // Did Document
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair: this.keypair,
      baseUrl
    })
    this.did = did
    this.didDocument = didDocument
    this.trustedIssuers = trustedIssuers

    // Resolver
    this.resolver = resolver
    this.resolver.addToCache(this.did, this.didDocument)
  }

  async verifyCredential(credential: W3CCredential) {
    await verifyParsedCredential(credential, {
      resolver: this.resolver,
      trustedIssuers: this.trustedIssuers,
      verifiers: [getControllerClaimVerifier()]
    })
  }
}
