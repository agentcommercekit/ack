import { spawn } from "child_process"
import { colors, waitForEnter } from "@repo/cli-tools"
import type { ChildProcess } from "child_process"

async function main() {
  console.log("🚀 Starting A2A Bank Identity Verification Demo...\n")
  console.log(
    colors.yellow("📚 DEMO OVERVIEW: ACK-ID + A2A Identity Verification")
  )
  console.log(
    colors.yellow(
      "   This demo shows how two agents establish trust without shared secrets"
    )
  )
  console.log(colors.yellow("   • Bank Teller: secp256k1 keys (ES256K JWTs)"))
  console.log(colors.yellow("   • Bank Customer: Ed25519 keys (EdDSA JWTs)"))
  console.log(
    colors.yellow(
      "   • Trust is established through cryptographic proof of DID ownership"
    )
  )
  console.log("")

  // Wait for user to be ready
  await waitForEnter("Press Enter to start the demo...")
  console.log("")

  // Start the bank teller server
  console.log(
    colors.yellow(
      "🏦 Starting Bank Teller Agent (will wait for customer connections)..."
    )
  )
  console.log("")
  const server: ChildProcess = spawn("tsx", ["./src/bank-teller-agent.ts"], {
    stdio: "inherit"
  })

  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Wait a moment for server to start, then run the client
  console.log("")
  console.log(
    colors.yellow(
      "📚 Now starting Bank Customer Agent to connect to the bank..."
    )
  )
  console.log("")
  await waitForEnter("Press Enter to start the customer agent...")
  console.log("")
  const client: ChildProcess = spawn("tsx", ["./src/bank-client-agent.ts"], {
    stdio: "inherit"
  })

  client.on("close", (code: number | null) => {
    console.log("")
    console.log(
      colors.yellow(
        "🎉 DEMO COMPLETE: Secure Agent-to-Agent Communication Established!"
      )
    )
    console.log(colors.yellow("   Key achievements:"))
    console.log(colors.yellow("   ✓ No passwords or shared secrets were used"))
    console.log(
      colors.yellow("   ✓ Cross-algorithm compatibility (secp256k1 ↔ Ed25519)")
    )
    console.log(colors.yellow("   ✓ Cryptographic proof of identity ownership"))
    console.log(
      colors.yellow(
        "   ✓ Decentralized identity verification via DID documents"
      )
    )
    console.log("\n✅ Banking demo completed!")
    server.kill()
    process.exit(code ?? 0)
  })

  client.on("error", (err: Error) => {
    console.error("Client error:", err)
    server.kill()
    process.exit(1)
  })

  server.on("error", (err: Error) => {
    console.error("Server error:", err)
    process.exit(1)
  })

  // Handle cleanup
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...")
    server.kill()
    process.exit(0)
  })
}

// Start the demo
main().catch(console.error)
