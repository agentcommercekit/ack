import {
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  createPaymentReceipt,
  generateKeypair,
  signCredential,
  verifyPaymentToken
} from "agentcommercekit"
import type {
  DidDocument,
  DidResolver,
  DidUri,
  JwtString,
  Keypair,
  PaymentRequest
} from "agentcommercekit"

export class ReceiptIssuer {
  readonly did: DidUri
  readonly didDocument: DidDocument
  private readonly keypair: Keypair
  private readonly signer
  private readonly resolver: DidResolver

  private constructor({
    baseUrl,
    keypair,
    resolver
  }: {
    baseUrl: string
    keypair: Keypair
    resolver: DidResolver
  }) {
    // Keypair
    this.keypair = keypair
    this.signer = createJwtSigner(this.keypair)

    // Did Document
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair: this.keypair,
      baseUrl
    })
    this.did = did
    this.didDocument = didDocument

    // Resolver
    this.resolver = resolver
    this.resolver.addToCache(this.did, this.didDocument)
  }

  static async create({
    baseUrl,
    resolver
  }: {
    baseUrl: string
    resolver: DidResolver
  }): Promise<ReceiptIssuer> {
    const keypair = await generateKeypair("secp256k1")
    return new ReceiptIssuer({ baseUrl, keypair, resolver })
  }

  /**
   * Issues a payment receipt credential after verifying the payment
   */
  async issueReceipt({
    payerDid,
    txHash,
    paymentToken
  }: {
    payerDid: DidUri
    txHash: string
    paymentToken: string
  }): Promise<JwtString> {
    const { paymentRequest } = await verifyPaymentToken(paymentToken, {
      resolver: this.resolver
    })

    // Verify the payment on-chain
    const paymentVerified = await this.verifyPaymentOnChain(
      txHash,
      paymentRequest
    )
    if (!paymentVerified) {
      throw new Error("Payment verification failed")
    }

    // Create and sign the receipt credential
    const credential = createPaymentReceipt({
      paymentToken,
      paymentOptionId: paymentRequest.paymentOptions[0].id,
      issuer: this.did,
      payerDid
    })

    const jwt = await signCredential(credential, {
      did: this.did,
      signer: this.signer,
      alg: "ES256K"
    })

    return jwt
  }

  /**
   * Verifies a payment on the blockchain
   */
  private async verifyPaymentOnChain(
    txHash: string,
    _paymentRequest: PaymentRequest
  ): Promise<boolean> {
    // Implementation will use your local libraries
    // This is where you would verify the transaction on-chain
    console.log(`[receipt-issuer] Verifying payment on chain for tx ${txHash}`)
    return Promise.resolve(true)
  }
}
