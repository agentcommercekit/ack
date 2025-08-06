import {
  createControllerCredential,
  createDidDocumentFromKeypair,
  createDidWebUri,
  createJwtSigner,
  curveToJwtAlgorithm,
  generateKeypair,
  signCredential,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtSigner,
  type Keypair,
  type Verifiable,
  type W3CCredential
} from "agentcommercekit"

interface CredentialIssuerParams {
  baseUrl: string
  resolver: DidResolver
  keypair?: Keypair
}

/**
 * Credential Issuer Service
 * Issues verifiable credentials for agent ownership
 */
export class CredentialIssuer {
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly keypair: Keypair
  readonly signer: JwtSigner
  private resolver: DidResolver

  constructor({
    did,
    didDocument,
    keypair,
    resolver
  }: {
    did: DidUri
    didDocument: DidDocument
    keypair: Keypair
    resolver: DidResolver
  }) {
    this.did = did
    this.didDocument = didDocument
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)
    this.resolver = resolver
  }

  static async create({
    baseUrl,
    resolver,
    keypair
  }: CredentialIssuerParams): Promise<CredentialIssuer> {
    const kp = keypair || (await generateKeypair("Ed25519"))
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair: kp
    })

    // Add to resolver cache
    resolver.addToCache(did, didDocument)

    return new CredentialIssuer({
      did,
      didDocument,
      keypair: kp,
      resolver
    })
  }

  /**
   * Issue a controller credential
   * This proves that an owner controls an agent
   */
  async issueControllerCredential(
    controller: DidUri,
    subject: DidUri
  ): Promise<Verifiable<W3CCredential>> {
    const credential = createControllerCredential({
      controller,
      subject,
      issuer: this.did
    })

    const { verifiableCredential } = await signCredential(credential, {
      did: this.did,
      signer: this.signer,
      alg: curveToJwtAlgorithm(this.keypair.curve),
      resolver: this.resolver
    })

    return verifiableCredential
  }
}
