import { colors, log } from "@repo/cli-tools"
import {
  createDidPkhDocument,
  createDidWebDocumentFromKeypair,
  createJwtSigner,
  createPaymentRequestBody,
  curveToJwtAlgorithm,
  generateKeypair
} from "agentcommercekit"
import { PaymentRequiredError } from "./payment-required-error"
import { publicKeyToAddress } from "./utils/evm-address"
import { verifyAgentIdentityWithCredential } from "./verification"
import type { CredentialVerifier } from "./credential-verifier"
import type { ReceiptVerifier } from "./receipt-verifier"
import type {
  DidDocument,
  DidPkhChainId,
  DidResolver,
  DidUri,
  JwtSigner,
  JwtString,
  Keypair,
  PaymentRequest
} from "agentcommercekit"

interface AgentConstructorParams {
  did: DidUri
  didDocument: DidDocument
  ownerDid: DidUri
  keypair: Keypair
  resolver: DidResolver
  receiptVerifier: ReceiptVerifier
  credentialVerifier: CredentialVerifier
  wallet: Keypair
  preferredChainId: DidPkhChainId
}

export class Agent {
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly ownerDid: DidUri
  readonly keypair: Keypair
  readonly signer: JwtSigner
  readonly wallet: Keypair
  readonly walletAddress: string
  readonly walletDid: DidUri
  ownershipVc?: JwtString
  private readonly resolver: DidResolver
  private readonly receiptVerifier: ReceiptVerifier
  private readonly credentialVerifier: CredentialVerifier
  private readonly preferredChainId: DidPkhChainId
  // An optional map of id to the request itself (e.g. product, message, etc)
  private pendingRequests: Record<string, PaymentRequest> = {}

  constructor({
    did,
    didDocument,
    ownerDid,
    keypair,
    resolver,
    receiptVerifier,
    credentialVerifier,
    wallet,
    preferredChainId
  }: AgentConstructorParams) {
    // DID
    this.did = did
    this.didDocument = didDocument
    this.ownerDid = ownerDid

    // Keypair
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)

    // Wallet
    this.wallet = wallet
    this.walletAddress = publicKeyToAddress(wallet.publicKey)

    this.preferredChainId = preferredChainId
    const { did: walletDid, didDocument: walletDidDocument } =
      createDidPkhDocument({
        keypair: this.wallet,
        address: this.walletAddress,
        chainId: this.preferredChainId
      })
    this.walletDid = walletDid
    resolver.addToCache(walletDid, walletDidDocument)

    // Resolver
    this.resolver = resolver
    resolver.addToCache(did, didDocument)

    // Receipt Verifier
    this.receiptVerifier = receiptVerifier

    // Credential Verifier
    this.credentialVerifier = credentialVerifier
  }

  static async create({
    ownerDid,
    preferredChainId,
    resolver,
    receiptVerifier,
    credentialVerifier
  }: {
    ownerDid: DidUri
    preferredChainId: DidPkhChainId
    resolver: DidResolver
    receiptVerifier: ReceiptVerifier
    credentialVerifier: CredentialVerifier
  }): Promise<Agent> {
    // Generate separate keypair for identity/DID
    const keypair = await generateKeypair("secp256k1")

    // Generate wallet for payments
    const walletKeypair = await generateKeypair("secp256k1")
    const walletAddress = publicKeyToAddress(walletKeypair.publicKey)

    // Use the identity keypair for DID generation
    const baseUrl = `https://agent.${walletAddress}.example.com`
    const { did, didDocument } = createDidWebDocumentFromKeypair({
      keypair,
      baseUrl,
      controller: ownerDid
    })

    return new Agent({
      did,
      didDocument,
      ownerDid,
      keypair,
      resolver,
      receiptVerifier,
      credentialVerifier,
      wallet: walletKeypair,
      preferredChainId
    })
  }

  setOwnershipVc(vc: JwtString) {
    this.ownershipVc = vc
  }

  /**
   * Initiate a chat with another agent
   */
  async chatWith(otherAgent: Agent, message: string, receipt?: JwtString) {
    log(
      colors.dim(`
[chat] ${this.did} initiating chat with:
${colors.bold(otherAgent.did)}

[chat] Message: ${message}

[chat] Verifying other agent's identity:
${colors.bold(otherAgent.did)}
`)
    )

    const verified = await verifyAgentIdentityWithCredential(
      otherAgent.ownershipVc,
      this.resolver,
      this.credentialVerifier
    )
    if (!verified) {
      throw new Error("Other agent's credential verification failed")
    }

    // Send message to other agent and get their response
    return otherAgent.handleInboundChat(
      this.did,
      this.ownershipVc,
      message,
      receipt
    )
  }

  /**
   * Handle an incoming chat request
   */
  async handleInboundChat(
    fromDid: DidUri,
    fromOwnershipVc: JwtString | undefined,
    message: string,
    receipt?: JwtString
  ) {
    log(
      colors.dim(
        `
[chat] ${this.did} handling chat from ${fromDid}
[chat] Message: ${message}
[chat] Verifying other agent's identity: ${fromDid}
`
      ),
      { wrap: false }
    )
    const verified = await verifyAgentIdentityWithCredential(
      fromOwnershipVc,
      this.resolver,
      this.credentialVerifier
    )
    if (!verified) {
      throw new Error("Other agent's credential verification failed")
    }

    // If no receipt provided, generate payment request
    if (!receipt) {
      const { paymentRequest, paymentToken } = await createPaymentRequestBody(
        {
          id: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          paymentOptions: [
            {
              id: crypto.randomUUID(),
              amount: 500,
              decimals: 2,
              currency: "USD",
              recipient: this.walletDid
            }
          ]
        },
        {
          issuer: this.did,
          signer: this.signer,
          algorithm: curveToJwtAlgorithm(this.keypair.curve)
        }
      )

      // Optional: Store the pending payment tokens.
      this.pendingRequests[paymentToken] = paymentRequest

      throw new PaymentRequiredError(paymentRequest, paymentToken)
    }

    // Verify the receipt
    const { paymentToken } = await this.receiptVerifier.verifyReceipt(
      receipt,
      this.did
    )

    // Optional: Ensure the payment token was for this same type of request.
    // Payment requests and receipts are designed to allow for stateless
    // operation, but it can be useful to map a given request to a specific
    // action on the server.
    if (!this.pendingRequests[paymentToken]) {
      throw new Error("Payment token not found")
    }

    // Provide the service
    return {
      data: "Response to: " + message,
      timestamp: new Date().toISOString()
    }
  }
}
