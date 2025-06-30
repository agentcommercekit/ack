/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { colors, createLogger, waitForEnter } from "@repo/cli-tools"
import { A2AClient, Role } from "a2a-js"
import {
  curveToJwtAlgorithm,
  getDidResolver,
  resolveDid,
  verifyParsedCredential
} from "agentcommercekit"
import {
  createA2AHandshakeMessage,
  createSignedA2AMessage,
  verifyA2AHandshakeMessage
} from "agentcommercekit/a2a"
import { messageSchema } from "agentcommercekit/a2a/schemas/valibot"
import { v4 as uuidV4 } from "uuid"
import * as v from "valibot"
import { Agent } from "./agent"
import { didResolverWithIssuer, issuerDid } from "./issuer"
import { fetchUrlFromAgentCardUrl } from "./utils/fetch-agent-card"
import { startAgentServer } from "./utils/server-utils"
import type { AgentCard, Message } from "a2a-js"
import type { DidUri } from "agentcommercekit"
import type { Server } from "node:http"

const logger = createLogger("Bank Customer", colors.green)

export class BankClientAgent extends Agent {
  private a2aServerUrl: string | undefined = undefined // Will be discovered from DID document
  private server: Server | undefined = undefined // Server instance for cleanup

  async requestBankingServices(): Promise<void> {
    console.log(
      colors.yellow(
        "📚 STEP 1: Initial Setup - At this point, the agents cannot trust each other yet"
      )
    )
    console.log(
      colors.yellow(
        "   The bank client needs to discover and authenticate with the bank teller"
      )
    )
    console.log("")
    await waitForEnter("Press Enter to start the client agent...")

    logger.log("🏦 Bank Client: Starting up...")

    // Start our own server so our DID document is resolvable
    logger.log("🚀 Starting Bank Client server for DID document hosting...")

    try {
      this.server = startAgentServer(this, {
        logger,
        port: 3000
      })

      logger.log("✅ Bank Client server started successfully")
      logger.log(
        `🌐 Client DID document available at: ${colors.dim("http://localhost:3000/.well-known/did.json")}`
      )
    } catch (error) {
      logger.log("❌ Failed to start Bank Client server:", error as Error)
      throw error
    }

    // Wait a moment for the bank server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log(
      colors.yellow(
        "📚 STEP 2: Service Discovery - Client discovers the bank's public DID"
      )
    )
    console.log(
      colors.yellow(
        "   The client constructs the bank's did:web from its domain (localhost:3001)"
      )
    )
    console.log(
      colors.yellow(
        "   Then resolves the DID document to find the bank's public keys and services"
      )
    )
    console.log("")
    await waitForEnter("Press Enter to begin service discovery...")

    // Step 1: Discover bank teller DID and resolve DID document with AgentCard service
    const serverDid = this.discoverBankTellerDid()
    await this.resolveBankTellerDidDocument(serverDid)

    if (!this.a2aServerUrl) {
      throw new Error("Bank teller DID or A2A server URL not found")
    }

    // Step 2: Create A2A client using the discovered service endpoint
    const client = new A2AClient(this.a2aServerUrl)

    logger.log("🏦 Bank Client: Hello, I need to access my banking services.")

    console.log(
      colors.yellow(
        "📚 STEP 2.5: Unauthenticated Request - Client tries to access services without identity proof"
      )
    )
    console.log(
      colors.yellow(
        "   Let's see what happens when we try to access banking services without authentication..."
      )
    )
    console.log("")
    await waitForEnter(
      "Press Enter to attempt unauthenticated banking request..."
    )

    // Try to access banking services without authentication first
    try {
      const unauthenticatedMessage: Message = {
        role: Role.User,
        parts: [
          {
            type: "text",
            text: "I would like to check my account balance please."
          }
        ]
      }

      const unauthenticatedParams = {
        id: uuidV4(),
        message: unauthenticatedMessage
      }

      logger.log("🚨 Sending unauthenticated request to bank...")
      const unauthResponse = await client.sendTask(unauthenticatedParams)

      // This should not happen, but just in case
      logger.log("⚠️ Unexpected success:", JSON.stringify(unauthResponse))
    } catch (_error: unknown) {
      console.log("")
      console.log(
        colors.yellow("EXPECTED RESULT: Bank rejects unauthenticated request")
      )
      console.log(
        colors.yellow(
          "   The bank doesn't know who this customer is or if they can be trusted"
        )
      )
      console.log(colors.yellow("   Error received: Authentication required"))
      logger.log("✅ Bank REJECTED unauthenticated request")
      console.log("")
      await waitForEnter("Press Enter to begin proper identity verification...")
    }

    console.log(
      colors.yellow(
        "📚 STEP 3: Identity Challenge - Client sends cryptographic proof to bank"
      )
    )
    console.log(
      colors.yellow(
        "   Now the client creates a JWT signed with its private key, scoped to the bank's DID"
      )
    )
    console.log(
      colors.yellow(
        "   This cryptographically proves the client controls the private key for its DID"
      )
    )
    console.log("")
    await waitForEnter("Press Enter to send identity verification challenge...")

    // Step 3: Send identity verification challenge
    const authSuccess = await this.performIdentityVerification(
      client,
      serverDid
    )
    if (!authSuccess) {
      throw new Error("❌ Identity verification failed!")
    }

    try {
      console.log(
        colors.yellow(
          "📚 STEP 4: Authenticated Communication - Now both parties trust each other"
        )
      )
      console.log(
        colors.yellow(
          "   Client can now send signed messages to access banking services"
        )
      )
      console.log(
        colors.yellow(
          "   Bank verifies each message signature against the client's established identity"
        )
      )
      console.log(colors.yellow("   This time the request should succeed!"))
      console.log("")
      await waitForEnter("Press Enter to request banking services...")

      // Step 4: Send signed message for banking services
      const { message } = await createSignedA2AMessage(
        {
          role: Role.User,
          parts: [
            {
              type: "text",
              text: "I would like to access my banking services. Please verify my identity."
            }
          ]
        },
        {
          did: this.did,
          jwtSigner: this.jwtSigner,
          alg: curveToJwtAlgorithm(this.keypair.curve),
          expiresIn: 5 * 60
        }
      )

      const response = await client.sendTask({
        id: uuidV4(),
        message
      })

      // Validate response using Valibot
      const parseResult = v.safeParse(messageSchema, response)
      if (!parseResult.success) {
        logger.log(
          "❌ Invalid bank response format:",
          JSON.stringify(parseResult.issues)
        )
        return
      }

      const { parts } = parseResult.output
      const bankResponse = parts
        .filter(
          (part): part is { type: "text"; text: string } => part.type === "text"
        )
        .map((part) => part.text)
        .join("")

      console.log(colors.blue("🏦 Bank Teller:"), bankResponse)

      console.log("")
      console.log(
        colors.yellow("📚 SUCCESS: Secure Banking Session Established!")
      )
      console.log(
        colors.yellow(
          "   ✓ Mutual authentication completed using cryptographic DIDs"
        )
      )
      console.log(colors.yellow("   ✓ No shared secrets or passwords required"))
      console.log(
        colors.yellow(
          "   ✓ Each message is cryptographically signed and verified"
        )
      )
      console.log("")
      await waitForEnter("Press Enter to complete the demo...")

      logger.log(
        "🏦 Bank Client: Thank you! I appreciate the secure identity verification process."
      )
    } catch (error) {
      logger.log("❌ Error accessing banking services:", error as Error)
      if (error instanceof Error) {
        logger.log("Error message:", error.message)
        logger.log("Error stack:", error.stack ?? "No stack trace")
      }
    } finally {
      // Cleanup server
      if (this.server) {
        this.server.close()
        logger.log("🏦 Bank Client: Server stopped")
      }
    }
  }

  private async performIdentityVerification(
    client: A2AClient,
    serverDid: DidUri
  ): Promise<boolean> {
    try {
      logger.log("🔐 Starting identity verification with bank teller...")

      const { nonce, message } = await createA2AHandshakeMessage(
        Role.User,
        {
          recipient: serverDid,
          vc: this.vc
        },
        {
          did: this.did,
          jwtSigner: this.jwtSigner,
          alg: curveToJwtAlgorithm(this.keypair.curve),
          expiresIn: 5 * 60
        }
      )

      const identityParams = {
        id: uuidV4(),
        message
      }

      logger.log("🔐 Sending identity verification challenge...")
      const authResponse = await client.sendTask(identityParams)

      // Step 3: Verify bank teller response
      const { nonce: bankNonce, vc: bankVc } = await verifyA2AHandshakeMessage(
        authResponse,
        {
          // Validate that this is intended for our DID
          did: this.did,
          // Validate that the bank teller is the counterparty
          counterparty: serverDid
        }
      )

      await verifyParsedCredential(bankVc, {
        resolver: didResolverWithIssuer,
        trustedIssuers: [issuerDid]
      })

      // Check that bank teller included our nonce
      if (bankNonce !== nonce) {
        throw new Error("❌ Bank teller nonce mismatch")
      }

      logger.log("✅ Identity verification successful!")
      return true
    } catch (error) {
      logger.log("❌ Identity verification error:", error as Error)
      return false
    }
  }

  private discoverBankTellerDid(): DidUri {
    logger.log("🔍 Discovering bank teller DID from well-known endpoint...")

    // For did:web, we can construct the DID from the domain
    // This assumes the bank is using did:web at localhost:3001
    const serverDid = "did:web:localhost%3A3001"

    logger.log("✅ Bank Teller DID discovered:", colors.dim(serverDid))
    logger.log("🌐 Bank is using did:web for secure identity!")

    return serverDid
  }

  private async resolveBankTellerDidDocument(serverDid: DidUri): Promise<void> {
    try {
      logger.log("🔍 Resolving bank teller DID document...")

      const resolver = getDidResolver()
      const didResult = await resolveDid(serverDid, resolver)
      const didDocument = didResult.didDocument

      logger.log("✅ Bank teller DID document resolved successfully")
      logger.log("   DID Document ID:", colors.dim(didDocument.id))
      logger.log("   Services:", didDocument.service?.length ?? 0)

      // Look for AgentCard service in the DID document
      if (didDocument.service && didDocument.service.length > 0) {
        const agentCardService = didDocument.service.find(
          (service) => service.type === "AgentCard"
        )

        if (!agentCardService) {
          logger.log("⚠️  No AgentCard service found in DID document")
          throw new Error(
            "No AgentCard service found in bank teller DID document"
          )
        }

        logger.log("✅ Found AgentCard service in DID document:")
        logger.log("   Service ID:", colors.dim(agentCardService.id))
        logger.log(
          "   Service Endpoint:",
          colors.dim(JSON.stringify(agentCardService.serviceEndpoint, null, 2))
        )

        // Extract the A2A server URL from the service endpoint
        if (typeof agentCardService.serviceEndpoint !== "string") {
          throw new Error("AgentCard service endpoint is not a string")
        }

        // We need to fetch the url from the agent card
        this.a2aServerUrl = await fetchUrlFromAgentCardUrl(
          agentCardService.serviceEndpoint
        )
        logger.log(
          "✅ Discovered A2A server URL:",
          colors.dim(this.a2aServerUrl)
        )
      }
    } catch (error) {
      logger.log(
        "❌ Failed to resolve bank teller DID document:",
        error as Error
      )
      throw error // Don't continue if we can't resolve the DID document
    }
  }
}

// Create a simple AgentCard for the client
const agentCard: AgentCard = {
  name: "Bank Client",
  description: "Banking services client",
  version: "1.0.0",
  url: "http://localhost:3000",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  capabilities: { streaming: false },
  skills: []
}

export async function getClientAgent() {
  return BankClientAgent.create({
    agentCard,
    curve: "Ed25519",
    controller: "did:web:builder.ack.com"
  })
}
