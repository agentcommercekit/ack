import {
  colors,
  demoHeader,
  log,
  logJson,
  sectionHeader,
  successMessage,
  waitForEnter
} from "@repo/cli-tools"
import {
  caip2ChainIds,
  createJwt,
  getDidResolver,
  parseJwtCredential
} from "agentcommercekit"
import { Agent } from "./agent"
import { CredentialIssuer } from "./credential-issuer"
import { CredentialVerifier } from "./credential-verifier"
import { PaymentRequiredError } from "./payment-required-error"
import { ReceiptIssuer } from "./receipt-issuer"
import { ReceiptVerifier } from "./receipt-verifier"
import { User } from "./user"
import { publicKeyToAddress } from "./utils/evm-address"
import type { Keypair, PaymentRequest } from "agentcommercekit"

/**
 * The chain id to use for payments in this example.
 * The CHAIN_ID uses a Chain Agnostic Namespace, according to
 * CAIP-2.
 *
 * @see {@link https://namespaces.chainagnostic.org}
 */
const CHAIN_ID = caip2ChainIds.baseSepolia

/**
 * These are defined outside the `main` function because they are
 * assumed to be 3rd party services that exist.
 *
 * Their constructor adds their own DIDs to the resolver cache to
 * ensure they are always resolvable.
 */
const resolver = getDidResolver()

const credentialIssuer = await CredentialIssuer.create({
  baseUrl: "https://issuer.example.com",
  resolver
})

const credentialVerifier = await CredentialVerifier.create({
  baseUrl: "https://verifier.example.com",
  resolver,
  trustedIssuers: [credentialIssuer.did]
})

const receiptIssuer = await ReceiptIssuer.create({
  baseUrl: "https://receipt-issuer.example.com",
  resolver
})

const receiptVerifier = await ReceiptVerifier.create({
  baseUrl: "https://receipt-verifier.example.com",
  resolver
})

/**
 * Main function that orchestrates the entire flow
 */
async function main() {
  console.clear()
  log(demoHeader("ACK"), { wrap: false })
  log(`
${colors.bold("✨ === Agent Commerce Kit End-to-End Demo === ✨")}

${colors.dim(
  "This demo will walk through a complete end-to-end flow, demonstrating how agents can interact securely and make payments. We'll see how identity verification, payment processing, and resource access all work seamlessly together in the Agent Commerce Kit."
)}
`)

  await waitForEnter()

  log(
    sectionHeader(`Creating User 1 (Client Owner) & Agent 1 (Client Agent)`, {
      step: 1
    })
  )
  log(
    colors.dim(`
First, we'll set up a 'User' who owns an 'Agent'. The User has a Decentralized ID (DID) and a wallet.

The Agent also has its own DID and will be linked to its User via an Ownership Verifiable Credential (VC).

Creating User 1 and Agent 1...`)
  )

  const user1 = await User.create(resolver, CHAIN_ID)
  const agent1 = await Agent.create({
    ownerDid: user1.did,
    resolver,
    receiptVerifier,
    credentialVerifier,
    preferredChainId: CHAIN_ID
  })
  const payload = {
    controller: user1.did,
    subject: agent1.did
  }
  const signedPayload = await createJwt(payload, {
    issuer: user1.did,
    signer: user1.signer
  })

  const ownershipVc1 =
    await credentialIssuer.issueAgentOwnershipVc(signedPayload)
  agent1.setOwnershipVc(ownershipVc1)

  log(
    colors.dim(`
User 1 (Client Owner):
  DID: ${user1.did}
  Wallet Address: ${publicKeyToAddress(user1.wallet.publicKey)}

Agent 1 (Client Agent):
  DID: ${agent1.did}
  Ownership VC:`),
    { wrap: false }
  )
  logJson(await parseJwtCredential(ownershipVc1, resolver))
  log(`
colors.dim("This VC, issued by User 1, proves they control Agent 1.")}

${successMessage("User 1 and Agent 1 (Client) setup complete")}

${colors.dim("Next, we'll create a second User and Agent, which will be used as a 'server' to test the payment flow.")}
`)

  await waitForEnter()

  log(
    sectionHeader(`Creating User 2 (Server Owner) & Agent 2 (Server Agent)`, {
      step: 2
    })
  )

  const user2 = await User.create(resolver, CHAIN_ID)
  const agent2 = await Agent.create({
    ownerDid: user2.did,
    resolver,
    receiptVerifier,
    credentialVerifier,
    preferredChainId: CHAIN_ID
  })
  const payload2 = {
    controller: user2.did,
    subject: agent2.did
  }

  const signedPayload2 = await createJwt(payload2, {
    issuer: user2.did,
    signer: user2.signer
  })

  const ownershipVc2 =
    await credentialIssuer.issueAgentOwnershipVc(signedPayload2)
  agent2.setOwnershipVc(ownershipVc2)

  log(
    colors.dim(`
User 2 (Server Owner):
  DID: ${user2.did}
  Wallet Address: ${publicKeyToAddress(user2.wallet.publicKey)}

Agent 2 (Server Agent):
  DID: ${agent2.did}
  Ownership VC:`)
  )
  logJson(await parseJwtCredential(ownershipVc2, resolver))
  log(
    colors.dim(`
This VC, issued by User 2, proves they control Agent 2.

${successMessage("User 2 and Agent 2 (Server) setup complete")}

Next, the agents will begin communicating with each other.
`)
  )

  await waitForEnter()

  log(sectionHeader("Agent 1 Initiates Chat with Agent 2", { step: 3 }))
  log(
    colors.dim(`
Agent 1 will now try to communicate with Agent 2 by sending a message.
Agent 2 is configured to require payment for its services.
Agent 2 will first verify Agent 1's identity and ownership using its VC.
If identity is verified, Agent 2 will then respond with a 402 Payment Required error, including details for the payment.
`)
  )

  const message = "What's the current price of AAPL stock?"

  const { paymentRequest, paymentToken } = await chat(agent1, agent2, message)

  log(
    colors.dim(`
The server has verified Agent 1's identity and now requires payment.

Next, we will perform the payment and fetch a Receipt.
`)
  )

  await waitForEnter()

  log(
    sectionHeader("Agent 1 makes payment and receives a Receipt", { step: 4 })
  )
  logJson(paymentRequest)
  log(
    colors.dim(`
Payment must be made using token:
${paymentToken}

`)
  )

  await waitForEnter("Press Enter to simulate making the on-chain payment...")

  const txHash = await makeOnChainPayment({
    payingWallet: agent1.wallet,
    paymentRequest
  })
  log(
    successMessage(`Payment made.`),
    `Transaction Hash: ${colors.bold(txHash)}`,
    ""
  )

  await waitForEnter(
    "Press Enter to request a payment receipt from the Receipt Issuer..."
  )

  const receipt = await receiptIssuer.issueReceipt({
    payerDid: agent1.walletDid,
    txHash,
    paymentToken
  })
  log(successMessage("Payment Receipt VC Issued!"))
  logJson(await parseJwtCredential(receipt, resolver))
  log(
    colors.dim(
      "This VC, issued by the Receipt Issuer, attests to the payment transaction."
    ),
    ""
  )

  await waitForEnter(
    "Press Enter to retry the chat with Agent 2, this time including the payment receipt..."
  )

  await agent1.chatWith(agent2, message, receipt)

  log(
    "",
    successMessage(
      "The Client successfully used the Receipt to access the Server's protected resource."
    ),
    "Demo complete."
  )
}

/**
 * Makes an on-chain payment for a given PaymentRequest
 *
 * This is a placeholder implementation that simulates an on-chain
 * payment. In a real scenario, this would be replaced with the actual
 * on-chain payment logic.
 */
async function makeOnChainPayment(_opts: {
  payingWallet: Keypair
  paymentRequest: PaymentRequest
}): Promise<string> {
  const temporaryTxHash =
    "0xd00d6b4b84be44249b458c5d020b560e4bace33a7c320332501f78720f41a269"

  return Promise.resolve(temporaryTxHash)
}

async function chat(agent1: Agent, agent2: Agent, message: string) {
  try {
    await agent1.chatWith(agent2, message)
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      return {
        paymentRequest: error.paymentRequest,
        paymentToken: error.paymentToken
      }
    }

    throw error
  }

  throw new Error("Chat unexpectedly completed")
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0)
  })
