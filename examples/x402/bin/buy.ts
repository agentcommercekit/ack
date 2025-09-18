/**
 * This script purchases a product from the server by first verifying the server's
 * identity using ACK ID, and then sending a x402 payment using the x402-fetch
 * library.
 */
import dotenv from "dotenv"
import { createWalletClient, http } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { wrapFetchWithPayment } from "x402-fetch"
import { baseSepolia } from "viem/chains"
import {
  getControllerClaimVerifier,
  getDidResolver,
  verifyParsedCredential,
  W3CCredential
} from "agentcommercekit"

dotenv.config()

// this is the private key for the buyer's wallet
const privateKey = process.env.PRIVATE_KEY || generatePrivateKey()

// this is the API host for the seller
const apiHost = "http://localhost:5000"
const buyUri = `${apiHost}/buy`
const identifyUri = `${apiHost}/identify`

const account = privateKeyToAccount(privateKey as `0x${string}`)

console.log(
  "Client account",
  account.address,
  "- this will be used to sign the payment"
)

// Create a wallet client - this is used to sign the payment.
// x402 uses EIP-712 to sign the payment,
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia
})

// Wrap fetch with payment middleware - this automatically handles
// the payment process using the client that we configured above
const fetchWithPay = wrapFetchWithPayment(fetch, client, 1000000)

// this is the main function run when the script is executed
async function main() {
  await verifySeller()

  console.log("Making request to", buyUri)
  const response = await fetchWithPay(buyUri, {
    method: "GET"
  })
  const data = await response.json()

  console.log("✅ Purchase complete, received response:")
  console.log(JSON.stringify(data, null, 2))
}

/**
 * Verifies the server's identity and the Verifiable Credential by fetching from
 * the seller's /identify endpoint, which returns a Verifiable Credential.
 */
async function verifySeller() {
  try {
    console.log("Verifying server identity using ACK ID...")
    const response = await fetch(identifyUri)
    const vc = await response.json()

    console.log("Received Verifiable Credential:")
    console.log(JSON.stringify(vc, null, 2))

    await verifyCredential(vc)

    console.log("✅ Seller identity verified, proceeding with purchase...")

    return true
  } catch (error) {
    console.error("❌ Failed to verify seller:", error)
    throw error
  }
}

/**
 * Verifies a Verifiable Credential using the controller claim verifier.
 *
 * @param vc - The Verifiable Credential to verify
 */
async function verifyCredential(vc: W3CCredential) {
  const verifier = getControllerClaimVerifier()
  const resolver = getDidResolver()

  try {
    await verifyParsedCredential(vc, {
      resolver,
      verifiers: [verifier]
    })
    console.log("✅ VC verified successfully")
    return { did: vc.issuer.id }
  } catch (error) {
    console.error("❌ VC verification failed:", error)
    throw error
  }
}

main().catch(console.error)
