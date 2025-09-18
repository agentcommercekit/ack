/**
 * This script generates private keys for the server and controller and saves
 * them to a .dev.vars file for use with wrangler.
 */
import { writeFileSync } from "fs"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { resolve } from "path"
import { fileURLToPath } from "url"

function main() {
  console.log("Generating private keys and receiver address...")

  const serverKey = generatePrivateKey()
  const controllerKey = generatePrivateKey()
  const receiverAddress = privateKeyToAccount(generatePrivateKey()).address

  const content = `SERVER_PRIVATE_KEY="${serverKey}"\nCONTROLLER_PRIVATE_KEY="${controllerKey}"\nRECEIVER_ADDRESS="${receiverAddress}"\n`

  // Resolve path to the root of the x402 example directory
  const __dirname = fileURLToPath(new URL(".", import.meta.url))
  const filePath = resolve(__dirname, "../.dev.vars")

  try {
    writeFileSync(filePath, content, "utf-8")
    console.log(`✅ Successfully created .dev.vars file at ${filePath}`)
    console.log("You can now run 'pnpm dev' to start the server.")
  } catch (error) {
    console.error("❌ Failed to write .dev.vars file:", error)
  }
}

main()
