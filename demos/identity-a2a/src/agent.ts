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

import type {
  AgentCard,
  AgentExecutor,
  ExecutionEventBus,
  Message,
  RequestContext,
} from "@a2a-js/sdk"
import { colors } from "@repo/cli-tools"
import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  createJwtSigner,
  generateKeypair,
  type DidDocument,
  type DidUri,
  type JwtSigner,
  type KeyCurve,
  type Keypair,
  type Verifiable,
  type W3CCredential,
} from "agentcommercekit"
import { createAgentCardServiceEndpoint } from "agentcommercekit/a2a"
import { v4 } from "uuid"
import { issueCredential } from "./issuer"

type AgentConfig = {
  agentCard: AgentCard
  curve: KeyCurve
  controller: DidUri
}
export abstract class Agent implements AgentExecutor {
  constructor(
    public agentCard: AgentCard,
    public keypair: Keypair,
    public did: DidUri,
    public jwtSigner: JwtSigner,
    public didDocument: DidDocument,
    public vc: Verifiable<W3CCredential>,
  ) {}

  static async create<T extends Agent>(
    this: new (
      agentCard: AgentCard,
      keypair: Keypair,
      did: DidUri,
      jwtSigner: JwtSigner,
      didDocument: DidDocument,
      vc: Verifiable<W3CCredential>,
    ) => T,
    config: AgentConfig,
  ) {
    const { agentCard, curve, controller } = config

    const baseUrl = agentCard.url
    const agentCardUrl = `${baseUrl}/.well-known/agent.json`
    const keypair = await generateKeypair(curve)
    const jwtSigner = createJwtSigner(keypair)
    const did = createDidWebUri(baseUrl)
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair,
      service: [createAgentCardServiceEndpoint(did, agentCardUrl)],
    })

    console.log(`🌐 Generated ${curve} keypair with did:web for ${this.name}`)
    console.log("   DID:", colors.dim(did))
    console.log(
      "   Public key:",
      colors.dim(Buffer.from(keypair.publicKey).toString("hex")),
    )

    const vc = await issueCredential({
      subject: did,
      controller,
    })

    console.log("Generated sample VC for ownership attestation")
    console.log("VC:", colors.dim(JSON.stringify(vc, null, 2)))

    return new this(agentCard, keypair, did, jwtSigner, didDocument, vc)
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const message: Message = {
      kind: "message",
      messageId: v4(),
      role: "agent",
      parts: [
        {
          kind: "text",
          text: `User message ${requestContext.userMessage.messageId} received and processed`,
        },
      ],
    }

    eventBus.publish(message)
  }

  async cancelTask(
    _taskId: string,
    _eventBus: ExecutionEventBus,
  ): Promise<void> {
    // Task canceled
    return Promise.resolve()
  }
}
