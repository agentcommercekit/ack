import { colors, createLogger, waitForEnter } from "@repo/cli-tools"
import { Role } from "a2a-js"
import {
  curveToJwtAlgorithm,
  isDidUri,
  verifyParsedCredential
} from "agentcommercekit"
import {
  createA2AHandshakeMessage,
  verifyA2AHandshakeMessage,
  verifyA2ASignedMessage
} from "agentcommercekit/a2a"
import { Agent } from "./agent"
import { didResolverWithIssuer, issuerDid } from "./issuer"
import { startAgentServer } from "./utils/server-utils"
import type {
  AgentCard,
  Message,
  SendMessageRequest,
  SendMessageResponse
} from "a2a-js"

const logger = createLogger("Bank Teller", colors.blue)

class BankTellerAgent extends Agent {
  private authenticatedClients = new Set<string>()

  async onMessageSend(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      // Access message from request params
      const requestMessage = request.params.message

      // Check if this is an authentication request
      if (this.isAuthRequest(requestMessage)) {
        return await this.handleAuthentication(request)
      }

      const { issuer: clientDid } = await verifyA2ASignedMessage(
        requestMessage,
        {
          did: this.did
        }
      )

      if (!isDidUri(clientDid)) {
        throw new Error("Invalid issuer")
      }

      if (!this.authenticatedClients.has(clientDid)) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32001, message: "Authentication required" }
        }
      }

      // Proceed with banking service response

      const result = `Verified ${clientDid}.  You can now access your account.`
      const message: Message = {
        role: Role.Agent,
        parts: [{ type: "text", text: result }]
      }
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: message
      }
    } catch (_error: unknown) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32603, message: "Internal error" }
      }
    }
  }

  private isAuthRequest(message: Message): boolean {
    return message.parts.some((part) => "data" in part && "jwt" in part.data)
  }

  private async handleAuthentication(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      console.log("")
      console.log(
        colors.yellow("📚 BANK PERSPECTIVE: Verifying Customer Identity")
      )
      console.log(colors.yellow("   Bank receives a JWT from unknown customer"))
      console.log(
        colors.yellow(
          "   Must verify: 1) JWT signature is valid, 2) Customer controls the DID"
        )
      )
      console.log("")
      await waitForEnter(
        "Press Enter for bank to begin identity verification..."
      )

      logger.log("🔐 Processing customer identity verification request...")

      console.log(
        colors.yellow(
          "🔍 VERIFICATION PROCESS: Resolving customer's DID document"
        )
      )
      console.log(
        colors.yellow(
          "   Bank extracts customer DID from JWT and resolves their public keys"
        )
      )
      console.log(
        colors.yellow(
          "   Cryptographically verifies JWT signature against customer's public key"
        )
      )
      console.log("")
      await waitForEnter(
        "Press Enter to verify customer's cryptographic proof..."
      )

      const {
        nonce: clientNonce,
        iss: clientDid,
        vc: clientVc
      } = await verifyA2AHandshakeMessage(request.params.message, {
        did: this.did
      })

      await verifyParsedCredential(clientVc, {
        resolver: didResolverWithIssuer,
        trustedIssuers: [issuerDid]
      })

      console.log(
        colors.yellow(
          "✅ TRUST ESTABLISHED: Customer cryptographically proved their identity"
        )
      )
      console.log(
        colors.yellow(
          "   Bank now knows this customer controls the private key for their DID"
        )
      )
      console.log("")
      await waitForEnter("Press Enter for bank to create response JWT...")

      logger.log("✅ Customer identity verified:", colors.dim(clientDid))

      const { message } = await createA2AHandshakeMessage(
        Role.Agent,
        {
          recipient: clientDid,
          requestNonce: clientNonce,
          vc: this.vc
        },
        {
          did: this.did,
          jwtSigner: this.jwtSigner,
          alg: curveToJwtAlgorithm(this.keypair.curve),
          expiresIn: 5 * 60
        }
      )

      // Add client to authenticated list
      this.authenticatedClients.add(clientDid)

      console.log(
        colors.yellow(
          "🔐 RESPONSE: Bank sends back signed proof of successful verification"
        )
      )
      console.log(
        colors.yellow(
          "   Bank creates a response JWT that includes the customer's nonce"
        )
      )
      console.log(
        colors.yellow(
          "   This proves to customer that bank verified their identity correctly"
        )
      )
      console.log("")
      await waitForEnter(
        "Press Enter to send authentication response back to customer..."
      )

      logger.log(
        "🔐 Identity verification successful for customer:",
        colors.dim(clientDid)
      )

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: message
      }
    } catch (error) {
      logger.log("❌ Identity verification error:", error as Error)
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32603, message: "Identity verification failed" }
      }
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
        "access my account"
      ]
    }
  ],
  authentication: {
    schemes: ["public"]
  }
}

export async function startTellerServer() {
  // Create bank teller agent with did:web instead of did:key
  const bankTellerAgent = await BankTellerAgent.create({
    agentCard,
    curve: "secp256k1",
    controller: "did:web:bank.com"
  })

  // Start the server using shared utility
  return startAgentServer(bankTellerAgent, {
    logger,
    port: 3001
  })
}
