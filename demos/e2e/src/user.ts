import {
  createDidPkhDocument,
  createJwtSigner,
  generateKeypair,
  type Caip2ChainId,
  type DidDocument,
  type DidResolver,
  type DidUri,
  type JwtSigner,
  type Keypair,
} from "agentcommercekit"
import { publicKeyToAddress } from "./utils/evm-address"

interface ConstructorParams {
  wallet: Keypair
  preferredChainId: Caip2ChainId
  did: DidUri
  didDocument: DidDocument
  resolver: DidResolver
}

export class User {
  readonly wallet: Keypair
  readonly preferredChainId: Caip2ChainId
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly signer: JwtSigner

  private constructor({
    did,
    didDocument,
    resolver,
    wallet,
    preferredChainId,
  }: ConstructorParams) {
    // Wallet
    this.wallet = wallet
    this.preferredChainId = preferredChainId
    this.signer = createJwtSigner(wallet)

    // DID
    this.did = did
    this.didDocument = didDocument
    resolver.addToCache(did, didDocument)
  }

  static async create(
    resolver: DidResolver,
    chainId: Caip2ChainId,
  ): Promise<User> {
    const wallet = await generateKeypair("secp256k1")
    const address = publicKeyToAddress(wallet.publicKey)
    const { did, didDocument } = createDidPkhDocument({
      address,
      chainId,
    })

    return new User({
      wallet,
      did,
      didDocument,
      resolver,
      preferredChainId: chainId,
    })
  }
}
