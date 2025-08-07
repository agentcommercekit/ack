import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  generateKeypair,
  verifyParsedCredential,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type Keypair,
  type Verifiable,
  type W3CCredential
} from "agentcommercekit"

interface CredentialVerifierParams {
  baseUrl: string
  resolver: DidResolver
  trustedIssuers: DidUri[]
  keypair?: Keypair
}

/**
 * Credential Verifier Service
 * Verifies that credentials are valid and from trusted issuers
 */
export class CredentialVerifier {
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly keypair: Keypair
  private resolver: DidResolver
  private trustedIssuers: Set<DidUri>

  constructor({
    did,
    didDocument,
    keypair,
    resolver,
    trustedIssuers
  }: {
    did: DidUri
    didDocument: DidDocument
    keypair: Keypair
    resolver: DidResolver
    trustedIssuers: DidUri[]
  }) {
    this.did = did
    this.didDocument = didDocument
    this.keypair = keypair
    this.resolver = resolver
    this.trustedIssuers = new Set(trustedIssuers)
  }

  static async create({
    baseUrl,
    resolver,
    trustedIssuers,
    keypair
  }: CredentialVerifierParams): Promise<CredentialVerifier> {
    const kp = keypair || (await generateKeypair("Ed25519"))
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair: kp
    })

    // Add to resolver cache
    resolver.addToCache(did, didDocument)

    return new CredentialVerifier({
      did,
      didDocument,
      keypair: kp,
      resolver,
      trustedIssuers
    })
  }

  /**
   * Verify a credential
   */
  async verifyCredential(
    credential: Verifiable<W3CCredential>
  ): Promise<boolean> {
    // Verify the credential signature and structure
    await verifyParsedCredential(credential, {
      resolver: this.resolver,
      trustedIssuers: Array.from(this.trustedIssuers)
    })

    return true
  }
}
