import { colors } from "@repo/cli-tools"
import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  createJwt,
  createJwtSigner,
  curveToJwtAlgorithm,
  generateKeypair
} from "agentcommercekit"
import type { CredentialVerifier } from "./credential-verifier"
import type {
  DidDocument,
  DidResolver,
  DidUri,
  JwtSigner,
  Keypair,
  Verifiable,
  W3CCredential
} from "agentcommercekit"
import type { CoreMessage } from "ai"

interface AgentConstructorParams {
  ownerDid: DidUri
  resolver: DidResolver
  baseUrl: string
  verifier: CredentialVerifier
  keypair: Keypair
}

type RunResult = {
  text: string
  responseMessages: CoreMessage[]
}

export abstract class Agent {
  readonly did: DidUri
  readonly didDocument: DidDocument
  readonly ownerDid: DidUri
  readonly keypair: Keypair
  readonly signer: JwtSigner
  readonly resolver: DidResolver
  readonly verifier: CredentialVerifier

  ownershipVc?: Verifiable<W3CCredential>

  private messages: CoreMessage[] = []

  constructor({
    resolver,
    baseUrl,
    ownerDid,
    verifier,
    keypair
  }: AgentConstructorParams) {
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair,
      controller: ownerDid,
      service: [
        {
          id: `${did}/chat`,
          type: "ChatEndpoint",
          serviceEndpoint: `${baseUrl}/chat`
        },
        {
          id: `${did}/identity`,
          type: "IdentityService",
          serviceEndpoint: `${baseUrl}/identity`
        }
      ]
    })

    this.did = did
    this.ownerDid = ownerDid
    this.didDocument = didDocument
    this.verifier = verifier
    this.keypair = keypair
    this.signer = createJwtSigner(keypair)
    this.resolver = resolver

    resolver.addToCache(did, didDocument)
  }

  static async create<T extends Agent>(
    this: new (params: AgentConstructorParams) => T,
    params: Omit<AgentConstructorParams, "keypair">
  ): Promise<T> {
    const keypair = await generateKeypair("secp256k1")
    return new this({ ...params, keypair })
  }

  getOwnershipVc(): Verifiable<W3CCredential> {
    if (!this.ownershipVc) {
      throw new Error("Ownership VC not set")
    }

    return this.ownershipVc
  }

  setOwnershipVc(vc: Verifiable<W3CCredential>) {
    this.ownershipVc = vc
  }

  async signChallenge(challenge: string) {
    const challengeResponse = await createJwt(
      { sub: challenge },
      {
        issuer: this.did,
        signer: this.signer
      },
      {
        alg: curveToJwtAlgorithm(this.keypair.curve)
      }
    )

    return challengeResponse
  }

  async run(prompt: string): Promise<string> {
    console.log(
      `${colors.yellow(`\n> Agent ${this.did} processing prompt:`)} "${colors.dim(
        prompt
      )}"`
    )

    this.messages.push({
      role: "user",
      content: prompt
    })

    const result = await this._run(this.messages)

    this.messages.push(...result.responseMessages)

    return result.text
  }

  protected abstract _run(messages: CoreMessage[]): Promise<RunResult>
}
