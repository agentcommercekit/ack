import {
  A2AError,
  type AgentCard,
  type ExecutionEventBus,
  type Message,
  type RequestContext,
} from "@a2a-js/sdk"
import { colors, createLogger, waitForEnter } from "@repo/cli-tools"
import {
  curveToJwtAlgorithm,
  isDidUri,
  verifyParsedCredential,
} from "agentcommercekit"
import {
  createA2AHandshakeMessage,
  verifyA2AHandshakeMessage,
  verifyA2ASignedMessage,
} from "agentcommercekit/a2a"
import { v4 } from "uuid"
import { Agent } from "./agent"
import { didResolverWithIssuer, issuerDid } from "./issuer"
import { startAgentServer } from "./utils/server-utils"

const logger = createLogger("Bank Teller", colors.blue)

class BankTellerAgent extends Agent {
  private authenticatedClients = new Set<string>()

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    // Access message from request params
    const userMessage = requestContext.userMessage
    const taskId = requestContext.taskId
    // Check if this is an authentication request
    if (this.isAuthRequest(userMessage)) {
      logger.log("🔐 Received authentication request")
      const message = await this.handleAuthentication(requestContext)
      eventBus.publish(message)
      return
    }

    try {
      logger.log(
        "🔐 Verifying authentication request\n",
        colors.dim(JSON.stringify(userMessage, null, 2)),
      )

      const { issuer: clientDid } = await verifyA2ASignedMessage(userMessage, {
        did: this.did,
      })

      if (!isDidUri(clientDid)) {
        throw new Error("Invalid issuer")
      }

      if (!this.authenticatedClients.has(clientDid)) {
        throw new A2AError(-32001, "Authentication required", {}, taskId)
      }

      // Proceed with banking service response
      const message: Message = {
        kind: "message",
        messageId: v4(),
        role: "agent",
        parts: [
          {
            kind: "text",
            text: `Verified ${clientDid}.  You can now access your account.`,
          },
        ],
      }

      eventBus.publish(message)
    } catch (_error: unknown) {
      throw new A2AError(-32001, "Authentication required", {}, taskId)
    }
  }

  private isAuthRequest(message: Message): boolean {
    return message.parts.some(
      (part) => part.kind === "data" && "jwt" in part.data,
    )
  }

  private async handleAuthentication(
    requestContext: RequestContext,
  ): Promise<Message> {
    try {
      console.log("")
      console.log(
        colors.yellow("📚 BANK PERSPECTIVE: Verifying Customer Identity"),
      )
      console.log(colors.yellow("   Bank receives a JWT from unknown customer"))
      console.log(
        colors.yellow(
          "   Must verify: 1) JWT signature is valid, 2) Customer controls the DID",
        ),
      )
      console.log("")
      await waitForEnter(
        "Press Enter for bank to begin identity verification...",
      )

      logger.log("🔐 Processing customer identity verification request...")

      const {
        nonce: clientNonce,
        iss: clientDid,
        vc: clientVc,
      } = await verifyA2AHandshakeMessage(requestContext.userMessage, {
        did: this.did,
      })

      await verifyParsedCredential(clientVc, {
        resolver: didResolverWithIssuer,
        trustedIssuers: [issuerDid],
      })

      console.log(
        colors.yellow(
          "✅ TRUST ESTABLISHED: Customer cryptographically proved their identity",
        ),
      )
      console.log(
        colors.yellow(
          "   Bank now knows this customer controls the private key for their DID",
        ),
      )
      console.log("")
      await waitForEnter("Press Enter for bank to create response JWT...")

      logger.log("✅ Customer identity verified:", colors.dim(clientDid))

      const { message } = await createA2AHandshakeMessage(
        "agent",
        {
          recipient: clientDid,
          requestNonce: clientNonce,
          vc: this.vc,
        },
        {
          did: this.did,
          jwtSigner: this.jwtSigner,
          alg: curveToJwtAlgorithm(this.keypair.curve),
          expiresIn: 5 * 60,
        },
      )

      // Add client to authenticated list
      this.authenticatedClients.add(clientDid)

      console.log(
        colors.yellow(
          "🔐 RESPONSE: Bank sends back signed proof of successful verification",
        ),
      )
      console.log(
        colors.yellow(
          "   Bank creates a response JWT that includes the customer's nonce",
        ),
      )
      console.log(
        colors.yellow(
          "   This proves to customer that bank verified their identity correctly",
        ),
      )
      console.log("")
      await waitForEnter(
        "Press Enter to send authentication response back to customer...",
      )

      logger.log(
        "🔐 Identity verification successful for customer:",
        colors.dim(clientDid),
      )

      logger.log(colors.dim(JSON.stringify(message, null, 2)))

      return message
    } catch (error) {
      logger.log("❌ Identity verification error:", error as Error)
      throw new A2AError(
        -32603,
        "Identity verification failed",
        {},
        requestContext.taskId,
      )
    }
  }
}

const agentCard: AgentCard = {
  name: "Bank Teller Agent",
  description:
    "A digital bank teller agent that verifies customer identity and provides banking services",
  url: "http://localhost:3001",
  version: "1.0.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  capabilities: { streaming: false },
  skills: [
    {
      id: "verify_identity",
      name: "Verify Customer Identity",
      description:
        "Verifies customer identity using digital credentials and provides banking services",
      tags: ["banking", "identity", "verification", "security"],
      examples: [
        "verify my identity",
        "I need banking services",
        "access my account",
      ],
    },
  ],
}

export async function startTellerServer() {
  // Create bank teller agent with did:web instead of did:key
  const bankTellerAgent = await BankTellerAgent.create({
    agentCard,
    curve: "secp256k1",
    controller: "did:web:bank.com",
  })

  // Start the server using shared utility
  return startAgentServer(bankTellerAgent, {
    logger,
    port: 3001,
  })
}
