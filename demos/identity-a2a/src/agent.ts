/* eslint-disable @typescript-eslint/require-await */
/**
 * Agent base class with DID-first architecture
 *
 * Architecture:
 * - DID is the top-level identifier for each agent
 * - AgentCard is referenced as a service endpoint in the DID document
 * - Clients discover agents by resolving DID documents and finding AgentCard services
 * - Authentication uses DID-based JWT signing and verification
 */

import { colors } from "@repo/cli-tools"
import { Role } from "a2a-js"
import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  createJwtSigner,
  generateKeypair
} from "agentcommercekit"
import { createAgentCardServiceEndpoint } from "agentcommercekit/a2a"
import type {
  AgentCard,
  AgentExecutor,
  CancelTaskRequest,
  CancelTaskResponse,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  SendMessageStreamingRequest,
  SendMessageStreamingResponse,
  TaskResubscriptionRequest
} from "a2a-js"
import type {
  DidDocument,
  DidUri,
  JwtSigner,
  Keypair,
  KeypairAlgorithm
} from "agentcommercekit"

export abstract class Agent implements AgentExecutor {
  constructor(
    public agentCard: AgentCard,
    public keypair: Keypair,
    public did: DidUri,
    public jwtSigner: JwtSigner,
    public didDocument: DidDocument
  ) {}

  static async create<T extends Agent>(
    this: new (
      agentCard: AgentCard,
      keypair: Keypair,
      did: DidUri,
      jwtSigner: JwtSigner,
      didDocument: DidDocument
    ) => T,
    agentCard: AgentCard,
    algorithm: KeypairAlgorithm = "secp256k1"
  ) {
    const baseUrl = agentCard.url
    const agentCardUrl = `${baseUrl}/.well-known/agent.json`
    const keypair = await generateKeypair(algorithm)
    const jwtSigner = createJwtSigner(keypair)
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair,
      service: [createAgentCardServiceEndpoint(did, agentCardUrl)]
    })

    console.log(
      `🌐 Generated ${algorithm} keypair with did:web for ${this.name}`
    )
    console.log("   DID:", colors.dim(did))
    console.log(
      "   Public key:",
      colors.dim(Buffer.from(keypair.publicKey).toString("hex"))
    )

    return new this(agentCard, keypair, did, jwtSigner, didDocument)
  }

  async onMessageSend(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const response: Message = {
      role: Role.Agent,
      parts: [{ type: "text", text: "Message received and processed" }]
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: response
    }
  }

  async onCancel(request: CancelTaskRequest): Promise<CancelTaskResponse> {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Operation not supported" }
    }
  }

  onMessageStream(
    _request: SendMessageStreamingRequest
  ): AsyncGenerator<SendMessageStreamingResponse, void, unknown> {
    throw new Error("Method not implemented.")
  }
  onResubscribe(
    _request: TaskResubscriptionRequest
  ): AsyncGenerator<SendMessageStreamingResponse, void, unknown> {
    throw new Error("Method not implemented.")
  }
}
