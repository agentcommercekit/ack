/**
 * This is a simple server that implements the ACK ID protocol to serve
 * a Verifiable Credential that allows buyers to verify the server's identity,
 * and the x402 payment middleware to require payment to access protected routes.
 */
import { Hono } from "hono"
import { paymentMiddleware } from "x402-hono"
import { getServerIdentity, getControllerIdentity } from "./server-identity"
import {
  createControllerCredential,
  getDidResolver,
  parseJwtCredential,
  signCredential
} from "agentcommercekit"
import { Address } from "viem"

const app = new Hono()

// The address that will receive the payment
const receiverAddress = process.env.RECEIVER_ADDRESS!

// Configure the payment middleware
app.use(
  paymentMiddleware(
    receiverAddress as Address,
    {
      // Route configurations for protected endpoints
      "/buy": {
        price: "$0.03",
        network: "base-sepolia",
        config: {
          description: "Access to premium content"
        }
      }
    },
    {
      url: "https://x402.org/facilitator" // for testnet
    }
  )
)

// the buyer trusts this DID
const trustedDid = "did:web:localhost%3A5000:trusted"

// Returns the server's DID and Verifiable Credential
app.get("/identify", async (c) => {
  const signer = await getServerIdentity()
  const { did } = signer

  const unsigned = await createControllerCredential({
    issuer: did,
    subject: did,
    controller: trustedDid
  })

  const vcJwt = await signCredential(unsigned, signer)

  const vc = await parseJwtCredential(vcJwt, getDidResolver())

  return c.json(vc)
})

// Serve the controller DID document for did:web:localhost%3A5000:trusted
app.get("/trusted/.well-known/did.json", async (c) => {
  const { didDocument } = await getControllerIdentity()
  return c.json(didDocument)
})

// Serves the server's DID document
app.get("/.well-known/did.json", async (c) => {
  const { didDocument } = await getServerIdentity()
  return c.json(didDocument)
})

app.get("/buy", (c) => {
  return c.json({ message: "Here is the content you paid for. Enjoy!" })
})

export default app
