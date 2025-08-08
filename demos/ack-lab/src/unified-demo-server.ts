import "dotenv/config"
import { serve } from "@hono/node-server"
import { colors, log } from "@repo/cli-tools"
import {
  generateKeypair,
  getDidResolver,
  createDidWebUri,
  createDidDocumentFromKeypair,
  type DidUri,
  type Keypair,
  type JwtString
} from "agentcommercekit"

// Import agents for both demos
import { SwapRequestorAgent } from "./agents/swap-requestor"
import { SwapExecutorAgent } from "./agents/swap-executor"
import { DataRequestorAgent } from "./agents/data-requestor"
import { DataProviderAgent } from "./agents/data-provider"

import { CredentialIssuer } from "./services/credential-issuer"
import { CredentialVerifier } from "./services/credential-verifier"
import { MockAckLabService } from "./services/mock-ack-lab"
import { startAgentServer } from "./utils/agent-server"
import { DemoRouter } from "./utils/demo-router"
import type { AgentData } from "./types"

// Initialize resolver
const resolver = getDidResolver()

async function createOwner(name: string): Promise<{
  did: DidUri
  keypair: Keypair
}> {
  const keypair = await generateKeypair("Ed25519")
  const did = createDidWebUri(`https://${name}.example.com`)

  // Create and cache DID document for owner
  const didDocument = createDidDocumentFromKeypair({
    did,
    keypair
  })
  resolver.addToCache(did, didDocument)

  return { did, keypair }
}

interface DemoAgents {
  swap: {
    requestor: SwapRequestorAgent
    executor: SwapExecutorAgent
  }
  data: {
    requestor: DataRequestorAgent
    provider: DataProviderAgent
  }
}

async function setupSwapDemo(
  credentialIssuer: CredentialIssuer,
  credentialVerifier: CredentialVerifier
) {
  log("Setting up Swap Demo...")

  // Create owners
  const requestorOwner = await createOwner("alice")
  const executorOwner = await createOwner("bob")

  // Generate keypairs for agents
  const requestorKeypair = await generateKeypair("Ed25519")
  const executorKeypair = await generateKeypair("secp256k1")

  // Create agents with different ports for swap demo
  const requestorAgent = new SwapRequestorAgent({
    resolver,
    baseUrl: "http://localhost:5678", // Main requestor port (shared with UI)
    ownerDid: requestorOwner.did,
    verifier: credentialVerifier,
    keypair: requestorKeypair,
    policies: {
      requireCatenaICC: false,
      maxTransactionSize: 100000000, // 100 USDC
      dailyTransactionLimit: 1000000000 // 1000 USDC
    }
  })

  const executorAgent = new SwapExecutorAgent({
    resolver,
    baseUrl: "http://localhost:5679",
    ownerDid: executorOwner.did,
    verifier: credentialVerifier,
    keypair: executorKeypair,
    policies: {
      requireCatenaICC: false,
      maxTransactionSize: 100000000,
      dailyTransactionLimit: 1000000000
    }
  })

  // Issue ownership VCs
  const requestorVc = await credentialIssuer.issueControllerCredential(
    requestorOwner.did,
    requestorAgent.did
  )
  requestorAgent.setOwnershipVc(requestorVc)

  const executorVc = await credentialIssuer.issueControllerCredential(
    executorOwner.did,
    executorAgent.did
  )
  executorAgent.setOwnershipVc(executorVc)

  log(colors.green("✅ Swap demo initialized"))
  log(colors.dim(`  Requestor: ${requestorAgent.did}`))
  log(colors.dim(`  Executor: ${executorAgent.did}`))

  return {
    requestor: requestorAgent,
    executor: executorAgent,
    requestorData: {
      did: requestorAgent.did,
      vc:
        (requestorVc as any).proof?.jwt ||
        (requestorVc as unknown as JwtString),
      policies: requestorAgent.policies,
      privateKey: ""
    },
    executorData: {
      did: executorAgent.did,
      vc:
        (executorVc as any).proof?.jwt || (executorVc as unknown as JwtString),
      policies: executorAgent.policies,
      privateKey: ""
    },
    requestorKeypair,
    executorKeypair
  }
}

async function setupDataDemo(credentialVerifier: CredentialVerifier) {
  log("Setting up Data Monetization Demo...")

  // Create owners
  const requestorOwner = await createOwner("datacorp")
  const providerOwner = await createOwner("analyticsinc")

  // Create Catena issuer for data demo (requires Catena ICC)
  const catenaIssuer = await CredentialIssuer.create({
    baseUrl: "https://catena.example.com",
    resolver
  })

  // Generate keypairs for agents
  const requestorKeypair = await generateKeypair("Ed25519")
  const providerKeypair = await generateKeypair("secp256k1")

  // Create agents with different ports for data demo
  const requestorAgent = new DataRequestorAgent({
    resolver,
    baseUrl: "http://localhost:5682", // Different port for data requestor
    ownerDid: requestorOwner.did,
    verifier: credentialVerifier,
    keypair: requestorKeypair,
    policies: {
      requireCatenaICC: true,
      maxTransactionSize: 10000000000, // 10,000 USDC
      dailyTransactionLimit: 100000000000 // 100,000 USDC
    }
  })

  const providerAgent = new DataProviderAgent({
    resolver,
    baseUrl: "http://localhost:5681", // Keep provider on original port
    ownerDid: providerOwner.did,
    verifier: credentialVerifier,
    keypair: providerKeypair,
    policies: {
      requireCatenaICC: true,
      maxTransactionSize: 10000000000,
      dailyTransactionLimit: 100000000000
    }
  })

  // Issue Catena ICC credentials
  const requestorVc = await catenaIssuer.issueControllerCredential(
    requestorOwner.did,
    requestorAgent.did
  )
  requestorAgent.setOwnershipVc(requestorVc)

  const providerVc = await catenaIssuer.issueControllerCredential(
    providerOwner.did,
    providerAgent.did
  )
  providerAgent.setOwnershipVc(providerVc)

  log(colors.green("✅ Data monetization demo initialized"))
  log(colors.dim(`  Requestor: ${requestorAgent.did}`))
  log(colors.dim(`  Provider: ${providerAgent.did}`))
  log(colors.dim(`  Catena Issuer: ${catenaIssuer.did}`))

  return {
    requestor: requestorAgent,
    provider: providerAgent,
    requestorData: {
      did: requestorAgent.did,
      vc:
        (requestorVc as any).proof?.jwt ||
        (requestorVc as unknown as JwtString),
      policies: requestorAgent.policies,
      privateKey: ""
    },
    providerData: {
      did: providerAgent.did,
      vc:
        (providerVc as any).proof?.jwt || (providerVc as unknown as JwtString),
      policies: providerAgent.policies,
      privateKey: ""
    },
    requestorKeypair,
    providerKeypair
  }
}

async function main() {
  console.clear()
  log(colors.bold("\n🚀 ACK Unified Demo Server\n"))
  log(
    "Starting unified server for both Token Swap and Data Monetization demos..."
  )

  // Check for API keys
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    log(colors.yellow("\n⚠️  No API key detected!"))
    log(colors.dim("To enable AI responses, create a .env file with:"))
    log(colors.cyan("  ANTHROPIC_API_KEY=your_key_here"))
    log(colors.dim("  or"))
    log(colors.cyan("  OPENAI_API_KEY=your_key_here\n"))
    log(
      colors.dim(
        "The demos will continue but agent responses will be limited.\n"
      )
    )
  }

  // Create shared credential services
  const credentialIssuer = await CredentialIssuer.create({
    baseUrl: "https://issuer.example.com",
    resolver
  })

  const credentialVerifier = await CredentialVerifier.create({
    baseUrl: "https://verifier.example.com",
    resolver,
    trustedIssuers: [
      credentialIssuer.did,
      createDidWebUri("https://catena.example.com") // Also trust Catena
    ]
  })

  // Setup both demos
  log(colors.bold("\n📦 Initializing Demos\n"))

  const swapDemo = await setupSwapDemo(credentialIssuer, credentialVerifier)
  const dataDemo = await setupDataDemo(credentialVerifier)

  // Create a unified ACK-Lab service that knows about ALL agents
  // Start with swap demo agents
  const ackLab = new MockAckLabService(
    swapDemo.requestorData,
    swapDemo.executorData,
    swapDemo.requestorKeypair,
    swapDemo.executorKeypair
  )

  // Register data demo agents as well
  ackLab.registerAgent(dataDemo.requestorData, dataDemo.requestorKeypair, {
    "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
      "1000000000", // 1000 USDC for data requestor
    "caip19:eip155:1/slip44:60": "0" // 0 ETH
  })

  ackLab.registerAgent(dataDemo.providerData, dataDemo.providerKeypair, {
    "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "0", // 0 USDC for provider
    "caip19:eip155:1/slip44:60": "0" // 0 ETH
  })

  // Store all agents for reference
  const agents: DemoAgents = {
    swap: {
      requestor: swapDemo.requestor,
      executor: swapDemo.executor
    },
    data: {
      requestor: dataDemo.requestor,
      provider: dataDemo.provider
    }
  }

  // All agents are now registered in ACK-Lab, no need for context switching

  // Start services
  log(colors.bold("\n🔧 Starting Services\n"))

  // Start ACK-Lab service
  const ackLabApp = ackLab.createServer()
  const ackLabServer = serve({
    fetch: ackLabApp.fetch,
    port: 5680
  })
  log(colors.green("✅ ACK-Lab service started on port 5680"))

  // Start demo router (this is what the web UI will connect to)
  const router = new DemoRouter()
  const routerServer = serve({
    fetch: router.getApp().fetch,
    port: 5677
  })
  log(colors.green("✅ Demo Router started on port 5677 (Web UI endpoint)"))

  // Start swap demo agents
  const swapRequestorServer = await startAgentServer(swapDemo.requestor, 5678)
  log(colors.green("✅ Swap Requestor agent started on port 5678"))

  const swapExecutorServer = await startAgentServer(swapDemo.executor, 5679)
  log(colors.green("✅ Swap Executor agent started on port 5679"))

  // Start data demo agents
  const dataRequestorServer = await startAgentServer(dataDemo.requestor, 5682)
  log(colors.green("✅ Data Requestor agent started on port 5682"))

  const dataProviderServer = await startAgentServer(dataDemo.provider, 5681)
  log(colors.green("✅ Data Provider agent started on port 5681"))

  // Display status
  log(colors.bold("\n✨ All services running!\n"))
  log(colors.cyan("Demo Endpoints:"))
  log("  • Swap Demo:")
  log("    - Requestor: http://localhost:5678")
  log("    - Executor: http://localhost:5679")
  log("  • Data Demo:")
  log("    - Requestor: http://localhost:5682")
  log("    - Provider: http://localhost:5681")
  log("  • ACK-Lab: http://localhost:5680")
  log("  • Router (Web UI): http://localhost:5677")

  log(colors.bold("\n🌐 Web UI Instructions:\n"))
  log("1. Start the web UI: " + colors.cyan("cd web-ui && pnpm run dev"))
  log("2. Open " + colors.cyan("http://localhost:3000") + " in your browser")
  log("3. Switch between demos using the tabs at the top")
  log("4. Interact with the agents through the chat interface")

  log(colors.bold("\n💬 Available Commands:\n"))
  log(colors.dim("Swap Demo:"))
  log("  • 'Swap 60 USDC for ETH'")
  log("  • 'Exchange my USDC for Ethereum'")
  log(colors.dim("\nData Demo:"))
  log("  • 'I need the financial-markets-2024 dataset for 10 hours'")
  log("  • 'Get me consumer behavior data'")

  log(colors.dim("\n[Press Ctrl+C to stop all services]\n"))

  // Keep the process running
  process.on("SIGINT", () => {
    log(colors.dim("\nShutting down services..."))
    process.exit(0)
  })
}

// Run the unified server
main().catch((error) => {
  console.error(colors.red("Error:"), error)
  process.exit(1)
})
