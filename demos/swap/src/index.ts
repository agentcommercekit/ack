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
import { SwapRequestorAgent } from "./agents/swap-requestor"
import { SwapExecutorAgent } from "./agents/swap-executor"
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
  await demoHeader("ACK Swap Demo")

  log(colors.bold("\n💱 Welcome to the ACK Swap Demo! 💱"))
  log("\nThis demo showcases two AI agents conducting a token swap using:")
  log("• ACK-ID for identity verification")
  log("• ACK-Pay for secure payment processing")
  log("• Policy enforcement from ACK-Lab\n")

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
  const requestorOwner = await createOwner("alice")
  const executorOwner = await createOwner("bob")

  log(colors.green("✅ Owner identities created"))
  log(colors.dim(`  Alice: ${requestorOwner.did}`))
  log(colors.dim(`  Bob: ${executorOwner.did}`))

  // Create credential services
  const credentialIssuer = await CredentialIssuer.create({
    baseUrl: "https://issuer.example.com",
    resolver
  })

  const credentialVerifier = await CredentialVerifier.create({
    baseUrl: "https://verifier.example.com",
    resolver,
    trustedIssuers: [credentialIssuer.did]
  })

  // Create agents
  log("\nCreating agent identities...")

  // Generate keypairs for agents
  const requestorKeypair = await generateKeypair("Ed25519")
  const executorKeypair = await generateKeypair("secp256k1")

  const requestorAgent = new SwapRequestorAgent({
    resolver,
    baseUrl: "http://localhost:5678",
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
      maxTransactionSize: 100000000, // 100 USDC
      dailyTransactionLimit: 1000000000 // 1000 USDC
    }
  })

  log(colors.green("✅ Agent identities created"))
  log(colors.dim(`  Requestor: ${requestorAgent.did}`))
  log(colors.dim(`  Executor: ${executorAgent.did}`))

  // Step 2: Issue ownership VCs
  await sectionHeader("Step 2: Issuing Ownership Credentials")

  log("Issuing ownership credentials...")

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

  log(colors.green("✅ Ownership credentials issued"))

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

  const executorData: AgentData = {
    did: executorAgent.did,
    vc: (executorVc as any).proof?.jwt || (executorVc as unknown as JwtString),
    policies: executorAgent.policies,
    privateKey: "" // Not used in mock
  }

  // Create and start ACK-Lab service
  const ackLab = new MockAckLabService(
    requestorData,
    executorData,
    requestorAgent.keypair,
    executorAgent.keypair
  )

  const ackLabApp = ackLab.createServer()
  const ackLabServer = serve({
    fetch: ackLabApp.fetch,
    port: 5680
  })
  log(colors.green("✅ ACK-Lab service started on port 5680"))

  // Start executor agent server
  const executorServer = await startAgentServer(executorAgent, 5679)
  log(colors.green("✅ Executor agent started on port 5679"))

  // Start requestor agent server
  const requestorServer = await startAgentServer(requestorAgent, 5678)
  log(colors.green("✅ Requestor agent started on port 5678"))

  // Step 4: Display initial balances
  await sectionHeader("Step 4: Initial State")

  log("Initial token balances:")
  log(colors.cyan("  Requestor:"))
  log("    • 100 USDC")
  log("    • 0 ETH")
  log(colors.cyan("  Executor:"))
  log("    • 0 USDC")
  log("    • 0.5 ETH\n")

  // Step 5: Interactive swap
  await sectionHeader("Step 5: Token Swap")

  log(colors.bold("You can now interact with the requestor agent!"))
  log(colors.dim("Example: 'Can you swap 60 USDC for ETH?'"))
  log(
    colors.dim(
      "Commands: 'reset' (reset balances), 'topup' (add $100 USDC), 'exit'\n"
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
        log(colors.cyan("Updated balances:"))
        log(colors.cyan("  Requestor: 100 USDC, 0 ETH"))
        log(colors.cyan("  Executor: 0 USDC, 0.5 ETH"))
      } else {
        log(colors.red("❌ Failed to reset balances"))
      }
      continue
    }

    if (userInput.toLowerCase() === "topup") {
      log(colors.yellow("💰 Adding $100 USDC to requestor..."))
      const topupResponse = await fetch(
        "http://localhost:5680/topup-requestor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 100 })
        }
      )

      if (topupResponse.ok) {
        const result = await topupResponse.json()
        log(colors.green(`✅ ${result.message}`))

        // Show updated balance
        const balance = await requestorAgent.checkBalance()
        if (balance) {
          const usdcBalance = BigInt(
            balance[
              "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
            ] || "0"
          )
          const ethBalance = BigInt(balance["caip19:eip155:1/slip44:60"] || "0")
          const usdcAmount = Number(usdcBalance) / 1000000
          const ethAmount = Number(ethBalance) / 10 ** 18
          log(
            colors.cyan(
              `New requestor balance: ${usdcAmount} USDC, ${ethAmount.toFixed(4)} ETH`
            )
          )
        }
      } else {
        log(colors.red("❌ Failed to topup requestor"))
      }
      continue
    }

    await requestorAgent.run(userInput)

    if (requestorAgent.isSwapComplete()) {
      log(colors.green("\n🎉 Swap completed successfully!"))

      // Show final balances
      log("\nFinal token balances:")
      const requestorBalance = await requestorAgent.checkBalance()
      const executorBalance = await executorAgent.checkBalance()

      if (requestorBalance && executorBalance) {
        const requestorUsdc =
          Number(
            BigInt(
              requestorBalance[
                "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
              ] || "0"
            )
          ) / 1000000
        const requestorEth =
          Number(BigInt(requestorBalance["caip19:eip155:1/slip44:60"] || "0")) /
          10 ** 18
        const executorUsdc =
          Number(
            BigInt(
              executorBalance[
                "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
              ] || "0"
            )
          ) / 1000000
        const executorEth =
          Number(BigInt(executorBalance["caip19:eip155:1/slip44:60"] || "0")) /
          10 ** 18

        log(colors.cyan("  Requestor:"))
        log(`    • ${requestorUsdc} USDC`)
        log(`    • ${requestorEth.toFixed(4)} ETH`)
        log(colors.cyan("  Executor:"))
        log(`    • ${executorUsdc} USDC`)
        log(`    • ${executorEth.toFixed(4)} ETH`)
      }

      break
    }
  }

  // Cleanup
  log("\n" + colors.dim("Shutting down services..."))

  await demoFooter("Thanks for trying the ACK Swap Demo!")
  process.exit(0)
}

// Run the demo
main().catch((error) => {
  console.error(colors.red("Error:"), error)
  process.exit(1)
})
