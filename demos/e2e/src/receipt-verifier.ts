import {
  createDidWebDocumentFromKeypair,
  generateKeypair,
  verifyPaymentReceipt
} from "agentcommercekit"
import type {
  DidDocument,
  DidResolver,
  DidUri,
  JwtString,
  Keypair
} from "agentcommercekit"

export class ReceiptVerifier {
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
  }): Promise<ReceiptVerifier> {
    const keypair = await generateKeypair("secp256k1")
    return new ReceiptVerifier({ baseUrl, keypair, resolver, trustedIssuers })
  }

  /**
   * Verifies a payment receipt
   */
  async verifyReceipt(receiptJwt: JwtString, paymentRequestIssuer?: string) {
    return verifyPaymentReceipt(receiptJwt, {
      resolver: this.resolver,
      trustedReceiptIssuers: this.trustedIssuers,
      paymentRequestIssuer: paymentRequestIssuer,
      verifyPaymentRequestTokenJwt: true
    })
  }
}
