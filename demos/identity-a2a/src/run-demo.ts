import { colors, waitForEnter } from "@repo/cli-tools"
import { getClientAgent } from "./bank-client-agent"
import { startTellerServer } from "./bank-teller-agent"

async function main() {
  console.log("🚀 Starting A2A Bank Identity Verification Demo...\n")
  console.log(
    colors.yellow("📚 DEMO OVERVIEW: ACK-ID + A2A Identity Verification"),
  )
  console.log(
    colors.yellow(
      "   This demo shows how two agents establish trust without shared secrets",
    ),
  )
  console.log(colors.yellow("   • Bank Teller: secp256k1 keys (ES256K JWTs)"))
  console.log(colors.yellow("   • Bank Customer: Ed25519 keys (EdDSA JWTs)"))
  console.log(
    colors.yellow(
      "   • Trust is established through cryptographic proof of DID ownership",
    ),
  )
  console.log("")

  // Wait for user to be ready
  await waitForEnter("Press Enter to start the demo...")
  console.log("")

  // Start the bank teller server
  console.log(
    colors.yellow(
      "🏦 Starting Bank Teller Agent (will wait for customer connections)...",
    ),
  )
  console.log("")
  const server = await startTellerServer()

  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Wait a moment for server to start, then run the client
  console.log("")
  console.log(
    colors.yellow(
      "📚 Now starting Bank Customer Agent to connect to the bank...",
    ),
  )
  console.log("")
  await waitForEnter("Press Enter to start the customer agent...")
  console.log("")

  const bankClientAgent = await getClientAgent()

  await bankClientAgent.requestBankingServices()

  server.close()
}

// Start the demo
main().catch(console.error)
