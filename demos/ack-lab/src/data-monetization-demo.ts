import "dotenv/config"
import { serve } from "@hono/node-server"
import {
  colors,
  demoFooter,
  demoHeader,
  input,
  log,
  logJson,
  sectionHeader,
  waitForEnter
} from "@repo/cli-tools"
import {
  generateKeypair,
  getDidResolver,
  createDidWebUri,
  createDidDocumentFromKeypair,
  type DidUri,
  type Keypair,
  type JwtString
} from "agentcommercekit"
import { DataRequestorAgent } from "./agents/data-requestor"
import { DataProviderAgent } from "./agents/data-provider"
import { CredentialIssuer } from "./services/credential-issuer"
import { CredentialVerifier } from "./services/credential-verifier"
import { MockAckLabService } from "./services/mock-ack-lab"
import { startAgentServer } from "./utils/agent-server"
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

async function main() {
  await demoHeader("ACK Data Monetization Demo")

  log(colors.bold("\n📊 Welcome to the ACK Data Monetization Demo! 📊"))
  log(
    "\nThis demo showcases AI agents negotiating and transacting data access using:"
  )
  log("• Discovery of available datasets")
  log("• Credential verification with Catena ICC")
  log("• Multi-round price negotiation")
  log("• Secure payment via ACK-Pay")
  log("• Time-limited access token generation\n")

  // Check for API keys
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    log(colors.yellow("⚠️  No API key detected!"))
    log(colors.dim("To enable AI responses, create a .env file with:"))
    log(colors.cyan("  ANTHROPIC_API_KEY=your_key_here"))
    log(colors.dim("  or"))
    log(colors.cyan("  OPENAI_API_KEY=your_key_here\n"))
    log(
      colors.dim(
        "The demo will continue but agent responses will be limited.\n"
      )
    )
  }

  await waitForEnter("Press Enter to begin setup...")

  // Step 1: Create owners and agents
  await sectionHeader("Step 1: Creating Identities")

  log("Creating owner identities...")
  const requestorOwner = await createOwner("datacorp")
  const providerOwner = await createOwner("analyticsinc")

  log(colors.green("✅ Owner identities created"))
  log(colors.dim(`  DataCorp: ${requestorOwner.did}`))
  log(colors.dim(`  AnalyticsInc: ${providerOwner.did}`))

  // Create credential services (Catena as issuer)
  const catenaIssuer = await CredentialIssuer.create({
    baseUrl: "https://catena.example.com",
    resolver
  })

  const credentialVerifier = await CredentialVerifier.create({
    baseUrl: "https://verifier.example.com",
    resolver,
    trustedIssuers: [catenaIssuer.did]
  })

  // Create agents
  log("\nCreating agent identities...")

  // Generate keypairs for agents
  const requestorKeypair = await generateKeypair("Ed25519")
  const providerKeypair = await generateKeypair("secp256k1")

  const requestorAgent = new DataRequestorAgent({
    resolver,
    baseUrl: "http://localhost:5678",
    ownerDid: requestorOwner.did,
    verifier: credentialVerifier,
    keypair: requestorKeypair,
    policies: {
      requireCatenaICC: true, // Requestor also requires Catena ICC
      maxTransactionSize: 10000000000, // 10,000 USDC
      dailyTransactionLimit: 100000000000 // 100,000 USDC
    }
  })

  const providerAgent = new DataProviderAgent({
    resolver,
    baseUrl: "http://localhost:5681",
    ownerDid: providerOwner.did,
    verifier: credentialVerifier,
    keypair: providerKeypair,
    policies: {
      requireCatenaICC: true,
      maxTransactionSize: 10000000000, // 10,000 USDC
      dailyTransactionLimit: 100000000000 // 100,000 USDC
    }
  })

  log(colors.green("✅ Agent identities created"))
  log(colors.dim(`  Requestor: ${requestorAgent.did}`))
  log(colors.dim(`  Provider: ${providerAgent.did}`))

  // Step 2: Issue Catena ICC credentials
  await sectionHeader("Step 2: Issuing Catena ICC Credentials")

  log("Issuing Catena ICC credentials...")

  // Issue ownership credentials with Catena as issuer
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

  log(colors.green("✅ Catena ICC credentials issued"))
  log(colors.dim(`  Issuer: ${catenaIssuer.did} (Catena)`))
  log(
    colors.dim(
      `  Issuer DID contains 'catena': ${catenaIssuer.did.toLowerCase().includes("catena")}`
    )
  )

  // Step 3: Setup ACK-Lab and start services
  await sectionHeader("Step 3: Starting Services")

  // Prepare agent data for ACK-Lab
  const requestorData: AgentData = {
    did: requestorAgent.did,
    vc:
      (requestorVc as any).proof?.jwt || (requestorVc as unknown as JwtString),
    policies: requestorAgent.policies,
    privateKey: "" // Not used in mock
  }

  const providerData: AgentData = {
    did: providerAgent.did,
    vc: (providerVc as any).proof?.jwt || (providerVc as unknown as JwtString),
    policies: {
      requireCatenaICC: true,
      maxTransactionSize: 10000000000,
      dailyTransactionLimit: 100000000000
    },
    privateKey: "" // Not used in mock
  }

  // Create and start ACK-Lab service
  const ackLab = new MockAckLabService(
    requestorData,
    providerData,
    requestorAgent.keypair,
    providerAgent.keypair
  )

  const ackLabApp = ackLab.createServer()
  const ackLabServer = serve({
    fetch: ackLabApp.fetch,
    port: 5680
  })
  log(colors.green("✅ ACK-Lab service started on port 5680"))

  // Start provider agent server
  const providerServer = await startAgentServer(providerAgent, 5681)
  log(colors.green("✅ Provider agent started on port 5681"))

  // Start requestor agent server
  const requestorServer = await startAgentServer(requestorAgent, 5678)
  log(colors.green("✅ Requestor agent started on port 5678"))

  // Step 4: Display available datasets
  await sectionHeader("Step 4: Available Datasets")

  log("The provider offers the following datasets:")
  log(colors.cyan("\n📈 financial-markets-2024"))
  log("   • Real-time and historical market data")
  log("   • Size: 500GB, Updates: real-time")
  log("   • Price range: $10-100/hour")

  log(colors.cyan("\n🛍️ consumer-behavior-q4"))
  log("   • Aggregated consumer purchasing patterns")
  log("   • Size: 250GB, Updates: daily")
  log("   • Price range: $10-100/hour")

  log(colors.cyan("\n🚚 supply-chain-insights"))
  log("   • Supply chain performance metrics")
  log("   • Size: 100GB, Updates: weekly")
  log("   • Price range: $10-100/hour\n")

  // Step 5: Display initial balances
  await sectionHeader("Step 5: Initial State")

  log("Initial USDC balances:")
  log(colors.cyan("  Requestor (DataCorp): 1,000 USDC"))
  log(colors.cyan("  Provider (AnalyticsInc): 0 USDC\n"))

  // Step 6: Interactive data monetization
  await sectionHeader("Step 6: Data Monetization")

  log(colors.bold("You can now interact with the requestor agent!"))
  log(colors.dim("\nExample requests:"))
  log(colors.dim("• 'I need the financial-markets-2024 dataset for 10 hours'"))
  log(colors.dim("• 'Get me consumer behavior data for analysis'"))
  log(colors.dim("• 'Can you acquire supply chain insights for 24 hours?'"))
  log(
    colors.dim(
      "\nCommands: 'list' (show datasets), 'balance' (check balance), 'exit'\n"
    )
  )

  let continueDemo = true

  while (continueDemo) {
    const userInput = await input({ message: "You: " })

    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      continueDemo = false
      break
    }

    // Handle special commands
    if (userInput.toLowerCase() === "list") {
      log(colors.cyan("\n📋 Available Datasets:"))
      log("• financial-markets-2024 - Real-time market data")
      log("• consumer-behavior-q4 - Consumer analytics")
      log("• supply-chain-insights - Supply chain metrics\n")
      continue
    }

    if (userInput.toLowerCase() === "balance") {
      log(colors.yellow("💰 Checking balance..."))
      const balance = await requestorAgent.checkBalance()
      if (balance) {
        const usdcBalance = BigInt(
          balance[
            "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
          ] || "0"
        )
        const usdcAmount = Number(usdcBalance) / 1000000
        log(colors.cyan(`Requestor balance: ${usdcAmount} USDC\n`))
      }
      continue
    }

    if (userInput.toLowerCase() === "reset") {
      log(colors.yellow("🔄 Resetting balances..."))
      const resetResponse = await fetch(
        "http://localhost:5680/reset-balances",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }
      )

      if (resetResponse.ok) {
        const result = await resetResponse.json()
        log(colors.green(`✅ ${result.message}`))
        log(colors.cyan("Requestor balance reset to: 1,000 USDC\n"))
      } else {
        log(colors.red("❌ Failed to reset balances"))
      }
      continue
    }

    // Process data request
    await requestorAgent.run(userInput)

    // Check if transaction completed
    const balance = await requestorAgent.checkBalance()
    if (balance) {
      const usdcBalance = BigInt(
        balance[
          "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        ] || "0"
      )
      const usdcAmount = Number(usdcBalance) / 1000000

      // Check provider balance too
      const providerBalance = await providerAgent.checkBalance()
      if (providerBalance) {
        const providerUsdc = BigInt(
          providerBalance[
            "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
          ] || "0"
        )
        const providerAmount = Number(providerUsdc) / 1000000

        if (providerAmount > 0) {
          log(colors.green("\n🎉 Data transaction completed!"))
          log("\nFinal USDC balances:")
          log(colors.cyan(`  Requestor: ${usdcAmount} USDC`))
          log(colors.cyan(`  Provider: ${providerAmount} USDC\n`))
        }
      }
    }
  }

  // Cleanup
  log("\n" + colors.dim("Shutting down services..."))

  await demoFooter("Thanks for trying the ACK Data Monetization Demo!")
  process.exit(0)
}

// Run the demo
main().catch((error) => {
  console.error(colors.red("Error:"), error)
  process.exit(1)
})
