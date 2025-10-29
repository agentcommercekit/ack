import {
  createDidWebDocumentFromKeypair,
  generateKeypair,
  getControllerClaimVerifier,
  InvalidCredentialSubjectError,
  isControllerCredential,
  parseJwtCredential,
  verifyParsedCredential,
  type ControllerCredential,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtString,
  type Keypair,
  type Verifiable
} from "agentcommercekit"

export class CredentialVerifier {
  readonly did: DidUri
  readonly didDocument: DidDocument
  private readonly keypair: Keypair
  private readonly resolver: DidResolver
  private readonly trustedIssuers?: DidUri[]

  private constructor({
    baseUrl,
    keypair,
    resolver,
    trustedIssuers
  }: {
    baseUrl: string
    keypair: Keypair
    resolver: DidResolver
    trustedIssuers?: DidUri[]
  }) {
    // Keypair
    this.keypair = keypair

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

  static async create({
    baseUrl,
    resolver,
    trustedIssuers
  }: {
    baseUrl: string
    resolver: DidResolver
    trustedIssuers?: DidUri[]
  }): Promise<CredentialVerifier> {
    const keypair = await generateKeypair("secp256k1")
    return new CredentialVerifier({
      baseUrl,
      keypair,
      resolver,
      trustedIssuers
    })
  }

  /**
   * Verifies a credential JWT
   */
  async verifyCredential(
    jwt: JwtString
  ): Promise<Verifiable<ControllerCredential>> {
    const parsedCredential = await parseJwtCredential(jwt, this.resolver)

    if (!isControllerCredential(parsedCredential)) {
      throw new InvalidCredentialSubjectError()
    }

    await verifyParsedCredential(parsedCredential, {
      resolver: this.resolver,
      trustedIssuers: this.trustedIssuers,
      verifiers: [getControllerClaimVerifier()]
    })

    return parsedCredential
  }
}
