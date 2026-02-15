import {
  colors,
  demoFooter,
  demoHeader,
  errorMessage,
  link,
  log,
  logJson,
  sectionHeader,
  select,
  successMessage,
  waitForEnter,
  wordWrap,
} from "@repo/cli-tools"
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token"
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit"
import {
  addressFromDidPkhUri,
  createDidPkhUri,
  createJwt,
  createJwtSigner,
  generateKeypair,
  getDidResolver,
  isDidPkhUri,
  isJwtString,
  parseJwtCredential,
  type JwtString,
  type PaymentReceiptCredential,
  type PaymentRequest,
  type Verifiable,
} from "agentcommercekit"
import {
  jwtStringSchema,
  paymentRequestSchema,
} from "agentcommercekit/schemas/valibot"
import * as v from "valibot"
import { isAddress } from "viem"

import {
  chain,
  chainId,
  publicClient,
  SERVER_URL,
  solana,
  usdcAddress,
} from "./constants"
import {
  ensureNonZeroBalances,
  ensureSolanaSolBalance,
} from "./utils/ensure-balances"
import { ensurePrivateKey, ensureSolanaKeys } from "./utils/ensure-private-keys"
import { getKeypairInfo, type KeypairInfo } from "./utils/keypair-info"
import { transferUsdc } from "./utils/usdc-contract"
import "./server"
import "./receipt-service"
import "./payment-service"

/**
 * Example showcasing payments using the ACK-Pay protocol.
 */
async function main() {
  console.clear()
  log(demoHeader("ACK-Pay"), { wrap: false })
  log(
    colors.bold(
      colors.magenta("\n✨ === Agent-Native Payments Protocol Demo === ✨"),
    ),
    colors.cyan(`
This demo will guide you through a typical payment flow between a Client and a Server. ACK-Pay enables secure, verifiable, and interoperable financial transactions among autonomous agents, services, and human participants. You can find more information at ${link("https://www.agentcommercekit.com")}.

This demo illustrates a common "paywall" use case: A server protecting a resource and requiring payment for access. The Server uses ACK-Pay to allow the Client to pay via several different payment methods. In this example the Server accepts ${colors.bold("Credit Card payments via Stripe")} as well as ${colors.bold("USDC on the Base Sepolia testnet")} for the payment.

The demo involves the following key components from the ACK-Pay protocol:`),
    colors.blue(`
1. ${colors.bold("Client:")} An application (this script) that wants to access a protected resource and needs to make a payment.
2. ${colors.bold("Server:")} An API that protects a resource and requires payment for access, initiating the payment request.
3. ${colors.bold("Payment Service:")} An intermediary that handles compliant payment execution. In this demo, the payment service is used for Credit Card payments, and is bypassed for on-chain payments using a crypto wallet and the Base Sepolia network to transfer USDC. In a full ACK-Pay deployment, a dedicated Payment Service offers more features like payment method abstraction (e.g., paying with different currencies or even credit cards), currency conversion, and enhanced compliance.
4. ${colors.bold("Receipt Service:")} A service that verifies the payment and issues a cryptographically verifiable receipt (as a Verifiable Credential).
`),
  )

  await waitForEnter("Press Enter to embark on the ACK-Pay journey...")

  log(`
Before we begin, we need to make sure all entities have public/private key pairs to sign messages. These can be defined as Environment variables or in your local .env file. If they are not present, we will generate new ones for you.\n

${colors.dim("Checking for existing keys ...")}
`)

  const [clientPrivateKeyHex, serverPrivateKeyHex, ..._rest] =
    await Promise.all([
      ensurePrivateKey("CLIENT_PRIVATE_KEY_HEX"),
      ensurePrivateKey("SERVER_PRIVATE_KEY_HEX"),
      ensurePrivateKey("RECEIPT_SERVICE_PRIVATE_KEY_HEX"),
      ensurePrivateKey("PAYMENT_SERVICE_PRIVATE_KEY_HEX"),
    ])

  const clientKeypairInfo = await getKeypairInfo(clientPrivateKeyHex)
  const serverKeypairInfo = await getKeypairInfo(serverPrivateKeyHex)

  log(
    `
Using the following public keys:

${colors.bold("Client:")} ${colors.dim(clientKeypairInfo.publicKeyHex)}
${colors.bold("Server:")} ${colors.dim(serverKeypairInfo.publicKeyHex)}
`,
    { wrap: false },
  )

  log(sectionHeader("🚪 Client Requests Protected Resource"))
  log(
    colors.dim(
      `${colors.bold("Client Agent 👤 -> Server Agent 🖥️")}

The Client attempts to access a protected resource on the Server. Since no valid payment receipt is presented, the Server will respond with an HTTP 402 'Payment Required' status. This response includes a cryptographically signed Payment Request (as a JWT), specifying the required amount, currency, and recipient for the payment.`,
    ),
  )

  await waitForEnter("Press Enter to make the request...")

  log(colors.dim("📡 Initiating GET request to the Server Agent..."))
  const response1 = await fetch(SERVER_URL, {
    method: "GET",
  })

  if (response1.status !== 402) {
    throw new Error("Server did not respond with 402")
  }

  const { paymentRequestToken, paymentRequest } = v.parse(
    v.object({
      paymentRequestToken: jwtStringSchema,
      paymentRequest: paymentRequestSchema,
    }),
    await response1.json(),
  )

  // This demo uses JWT strings for the payment request token, but this is not a requirement of the protocol.
  if (!isJwtString(paymentRequestToken)) {
    throw new Error(errorMessage("Invalid payment request token"))
  }

  log(
    successMessage(
      "Successfully received 402 Payment Required response from Server Agent. 🛑",
    ),
  )
  log(colors.bold("\n📜 Payment Request Details (from Server Agent):"))
  logJson(paymentRequest as Record<string, unknown>, colors.dim)
  log(
    colors.magenta(
      wordWrap(
        "\n💡 The 'paymentRequestToken' is a JWT signed by the Server, ensuring the integrity and authenticity of the payment request. The Client will include this token when requesting a receipt, along with the payment option id and metadata.",
      ),
    ),
  )

  const paymentOptions = paymentRequest.paymentOptions

  function networkLabel(network: string | undefined): string {
    if (network === "stripe") {
      return "Stripe"
    }

    if (network?.startsWith("solana:")) {
      return "Solana"
    }

    return "Base Sepolia"
  }

  const selectedPaymentOptionId = await select({
    message: "Select which payment option to use",
    choices: paymentOptions.map((option) => ({
      name: networkLabel(option.network),
      value: option.id,
      description: `Pay on ${networkLabel(option.network)} using ${option.currency}`,
    })),
  })

  const selectedPaymentOption = paymentOptions.find(
    (option) => option.id === selectedPaymentOptionId,
  )

  if (!selectedPaymentOption) {
    throw new Error(errorMessage("Invalid payment option"))
  }

  function executePayment(
    option: PaymentRequest["paymentOptions"][number],
  ): Promise<{
    receipt: string
    details: Verifiable<PaymentReceiptCredential>
  }> {
    if (option.network === "stripe") {
      return performStripePayment(
        clientKeypairInfo,
        option,
        paymentRequestToken,
      )
    }
    if (option.network?.startsWith("solana:")) {
      return performSolanaPayment(
        clientKeypairInfo,
        option,
        paymentRequestToken,
      )
    }
    if (option.network === chainId) {
      return performOnChainPayment(
        clientKeypairInfo,
        option,
        paymentRequestToken,
      )
    }
    throw new Error(errorMessage("Invalid payment option"))
  }

  const { receipt, details } = await executePayment(selectedPaymentOption)

  log(
    successMessage(
      "Verifiable Payment Receipt (VC) issued successfully by the Receipt Service! 🎉",
    ),
    colors.bold("📄 Receipt Details (Verifiable Credential):"),
  )
  const resolver = getDidResolver()
  const parsedDetails =
    typeof details === "string"
      ? await parseJwtCredential(details, resolver)
      : details
  logJson(parsedDetails, colors.dim)
  log(
    colors.magenta(
      "💡 This receipt is a Verifiable Credential (VC) in JWT format. It's cryptographically signed by the Receipt Service, making it tamper-proof and independently verifiable. It links the original payment request from the Server to the confirmed on-chain transaction and the Client's identity.",
    ),
  )

  log(
    sectionHeader(
      "✅ Access Protected Resource with Receipt (Client Agent -> Server Agent)",
    ),
  )
  log(
    colors.dim(
      `${colors.bold("Client Agent 👤 -> Server Agent 🖥️")}

The Client Agent now retries the original request to the Server Agent, this time presenting the Verifiable Payment Receipt (the VC obtained in Step 3) as a Bearer token in the Authorization header.

${colors.bold("The Server Agent then performs its own verifications:")}
1. Validates the receipt's signature (ensuring it was issued by a trusted Receipt Service and hasn't been tampered with).
2. Checks the receipt's claims: Confirms the receipt is for the correct payment (e.g., matches the 'paymentRequestToken' it originally issued), is not expired, and meets any other criteria for accessing the resource.

If the receipt is valid, the Server grants access to the protected resource.`,
    ),
  )

  await waitForEnter(
    "Press Enter to present the receipt to the Server and access the resource...",
  )

  log(
    colors.dim(
      "🔐 Making authenticated GET request to the Server Agent with the receipt...",
    ),
  )

  const response3 = await fetch(SERVER_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${receipt}`,
    },
  })

  if (response3.status !== 200) {
    throw new Error(errorMessage("Server did not respond with 200"))
  }

  const result = (await response3.json()) as Record<string, unknown>
  log(colors.bold("🚪 Server Response (Protected Resource):"))
  logJson(result, colors.dim)
  log(
    successMessage("Access granted to protected resource! 🔓"),
    colors.bold(colors.magenta("\n🎉 === ACK-Pay Demo Complete === 🎉\n")),
    colors.cyan(
      "Congratulations! You've successfully completed the ACK-Pay payment flow. This demonstrates how agents can programmatically negotiate and settle payments, obtaining verifiable proof for services or data access.",
    ),
    colors.yellow(
      `This demo was created by Catena Labs. For more information on ACK-Pay and other tools for the agent economy, please visit ${link("https://www.agentcommercekit.com")} 🌐.`,
    ),
    demoFooter("Thank You!"),
    { wrap: false },
  )
}

async function performOnChainPayment(
  client: KeypairInfo,
  paymentOption: PaymentRequest["paymentOptions"][number],
  paymentRequestToken: JwtString,
) {
  const receiptServiceUrl = paymentOption.receiptService
  if (!receiptServiceUrl) {
    throw new Error(errorMessage("Receipt service URL is required"))
  }

  log(colors.dim("🔍 Checking client wallet balances..."))
  await ensureNonZeroBalances(chain, client.crypto.address, usdcAddress)
  log(
    successMessage(
      "Balances verified! Client has sufficient ETH for gas and USDC for payment. ✅\n\n",
    ),
  )

  log(
    sectionHeader(
      "💸 Execute Payment (Client Agent -> Payment Service / Blockchain)",
    ),
  )
  log(
    colors.dim(
      `${colors.bold("Client Agent 👤 -> Blockchain 🔗 (acting as Payment Service)")}

The Client Agent now uses the details from the Payment Request to make the payment. In this demo, the Client transfers the specified amount of USDC to the Server's address on the Base Sepolia testnet. The resulting transaction hash serves as a preliminary proof of payment. This interaction implicitly uses the blockchain as a Settlement Network and the wallet interaction as a form of Payment Service.`,
    ),
  )

  await waitForEnter("Press Enter to proceed with the on-chain USDC payment...")

  const payToAddress = isDidPkhUri(paymentOption.recipient)
    ? addressFromDidPkhUri(paymentOption.recipient)
    : paymentOption.recipient

  if (!isAddress(payToAddress)) {
    throw new Error(errorMessage(`Invalid recipient address: ${payToAddress}`))
  }

  if (paymentOption.currency !== "USDC") {
    throw new Error(
      errorMessage(`Unsupported currency: ${paymentOption.currency}`),
    )
  }

  log(colors.dim("Initiating USDC transfer..."))

  const hash = await transferUsdc(
    client.crypto.account,
    payToAddress,
    BigInt(paymentOption.amount),
  )

  log(
    successMessage("Payment transaction submitted to the blockchain. 🚀"),
    "Transaction hash:",
  )
  log(colors.cyan(hash), { wrap: false })
  log(colors.dim("View on BaseScan:"))
  log(link(`https://sepolia.basescan.org/tx/${hash}`), {
    wrap: false,
  })
  log(
    colors.magenta(
      "💡 This transaction is now being processed by the Base Sepolia network. We need to wait for it to be confirmed (included in a block) before we can reliably use it as proof of payment.",
    ),
  )

  log(
    colors.dim(
      "⏳ Waiting for transaction confirmation (this might take a moment)...",
    ),
  )
  await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
  log(successMessage("Transaction confirmed on the blockchain! ✅\n\n"))

  log(
    sectionHeader(
      "🧾 Obtain Verifiable Receipt (Client Agent -> Receipt Service)",
    ),
  )
  log(
    colors.dim(
      `${colors.bold("Client Agent 👤 -> Receipt Service 🧾")}

With the payment confirmed, the Client Agent now requests a formal, cryptographically verifiable payment receipt from the Receipt Service. The Client sends the original 'paymentRequestToken' (received from the Server in Step 1) and the transaction hash (as metadata) to the Receipt Service. The Client also signs this request with its own DID to prove it's the one who made the payment.

${colors.bold("The Receipt Service then performs several crucial verifications:")}
1. Validates the 'paymentRequestToken' (e.g., signature, expiry, ensuring it was issued by a trusted server for the expected payment context).
2. Verifies the on-chain transaction: Confirms that the transaction hash is valid, the correct amount of the specified currency was transferred to the correct recipient address as per the 'paymentRequestToken'.
3. Verifies the Client's signature on the request, ensuring the payer is who they claim to be (linking the payment action to the Client's DID).

If all checks pass, the Receipt Service issues a Verifiable Credential (VC) serving as the payment receipt.`,
    ),
  )

  await waitForEnter("Press Enter to request the verifiable receipt...")

  log(
    colors.dim("✍️ Creating a signed payload (JWT) for the Receipt Service..."),
  )

  const payload = {
    paymentRequestToken,
    paymentOptionId: paymentOption.id,
    metadata: {
      txHash: hash,
      network: chainId, // eip155:84532
    },
    payerDid: client.did,
  }

  const signedPayload = await createJwt(payload, {
    issuer: client.did,
    signer: client.jwtSigner,
  })

  log(colors.dim("Submitting to receipt service..."))
  const response2 = await fetch(receiptServiceUrl, {
    method: "POST",
    body: JSON.stringify({
      payload: signedPayload,
    }),
  })

  const { receipt, details } = (await response2.json()) as {
    receipt: string
    details: Verifiable<PaymentReceiptCredential>
  }

  return { receipt, details }
}

async function performSolanaPayment(
  client: KeypairInfo,
  paymentOption: PaymentRequest["paymentOptions"][number],
  paymentRequestToken: JwtString,
) {
  const receiptServiceUrl = paymentOption.receiptService
  if (!receiptServiceUrl) {
    throw new Error(errorMessage("Receipt service URL is required"))
  }

  log(sectionHeader("💸 Execute Payment (Client Agent -> Solana / SPL Token)"))

  const rpc = createSolanaRpc(solana.rpcUrl)
  const clientSolKeys = await ensureSolanaKeys(
    "SOLANA_CLIENT_PUBLIC_KEY",
    "SOLANA_CLIENT_SECRET_KEY_JSON",
  )
  const keyBytes = new Uint8Array(
    JSON.parse(clientSolKeys.secretKeyJson) as number[],
  )
  const payerSigner = await createKeyPairSignerFromBytes(keyBytes)

  const mint = address(solana.usdcMint)

  // Ensure payer has SOL for fees
  await ensureSolanaSolBalance(clientSolKeys.publicKey)

  const recipient = address(paymentOption.recipient)

  const [senderAta] = await findAssociatedTokenPda({
    mint,
    owner: payerSigner.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const [recipientAta] = await findAssociatedTokenPda({
    mint,
    owner: recipient,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  // Ensure sender has USDC balance; if not, prompt Circle faucet
  let tokenBal: { amount: string }
  try {
    ;({ value: tokenBal } = await rpc
      .getTokenAccountBalance(senderAta, { commitment: solana.commitment })
      .send())
  } catch {
    tokenBal = { amount: "0" }
  }
  while (tokenBal.amount === "0") {
    log(
      colors.dim(
        "USDC balance is 0. Please request devnet USDC from Circle's faucet, then press Enter to retry.",
      ),
    )
    log(colors.dim(`Send USDC to your wallet: ${clientSolKeys.publicKey}`))
    log(colors.cyan("https://faucet.circle.com/"))
    await waitForEnter("Press Enter after funding USDC...")
    try {
      ;({ value: tokenBal } = await rpc
        .getTokenAccountBalance(senderAta, { commitment: solana.commitment })
        .send())
    } catch {
      tokenBal = { amount: "0" }
    }
  }
  const { value: recipientAtaInfo } = await rpc
    .getAccountInfo(recipientAta, {
      commitment: solana.commitment,
      encoding: "base64",
    })
    .send()
  const maybeCreateRecipientAtaInstruction = !recipientAtaInfo
    ? await getCreateAssociatedTokenInstructionAsync({
        payer: payerSigner,
        owner: recipient,
        mint,
        ata: recipientAta,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })
    : undefined

  const amount = BigInt(paymentOption.amount)
  const transferIx = getTransferCheckedInstruction({
    source: senderAta,
    destination: recipientAta,
    mint,
    authority: payerSigner.address,
    amount,
    decimals: paymentOption.decimals,
  })

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payerSigner, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) =>
      appendTransactionMessageInstructions(
        [
          ...(maybeCreateRecipientAtaInstruction
            ? [maybeCreateRecipientAtaInstruction]
            : []),
          transferIx,
        ],
        m,
      ),
  )
  const signedTx = await signTransactionMessageWithSigners(txMessage)
  const wireTx = getBase64EncodedWireTransaction(signedTx)
  const signature = await rpc
    .sendTransaction(wireTx, { encoding: "base64" })
    .send()
  log(colors.dim("View on Solana Explorer:"))
  log(link(`https://explorer.solana.com/tx/${signature}?cluster=devnet`), {
    wrap: false,
  })

  // Build an ACK Ed25519 signer from the Solana payer seed to sign the receipt request
  const ackEd25519Keypair = await generateKeypair(
    "Ed25519",
    new Uint8Array(Array.from(keyBytes).slice(0, 32)),
  )
  const ackEd25519JwtSigner = createJwtSigner(ackEd25519Keypair)
  const payerDid = createDidPkhUri(solana.chainId, clientSolKeys.publicKey)
  const payload = {
    paymentRequestToken,
    paymentOptionId: paymentOption.id,
    metadata: {
      network: solana.chainId,
      txHash: signature,
    },
    payerDid,
  }
  const signedPayload = await createJwt(
    payload,
    {
      issuer: payerDid,
      signer: ackEd25519JwtSigner,
    },
    { alg: "EdDSA" },
  )

  const response = await fetch(receiptServiceUrl, {
    method: "POST",
    body: JSON.stringify({ payload: signedPayload }),
  })
  const { receipt, details } = (await response.json()) as {
    receipt: string
    details: Verifiable<PaymentReceiptCredential>
  }

  return { receipt, details }
}

async function performStripePayment(
  _client: KeypairInfo,
  paymentOption: PaymentRequest["paymentOptions"][number],
  paymentRequestToken: JwtString,
) {
  const paymentServiceUrl = paymentOption.paymentService
  if (!paymentServiceUrl) {
    throw new Error(errorMessage("Payment service URL is required"))
  }

  log(
    sectionHeader(
      "💸 Execute Payment (Client Agent -> Payment Service / Stripe)",
    ),
  )
  log(
    colors.dim(
      `${colors.bold("Client Agent 👤 -> Payment Service 💳 -> Stripe")}

The Client Agent now uses the details from the Payment Request to initiate a Stripe payment. The Payment Service will generate a Stripe payment URL where the payment can be completed. After successful payment, Stripe will redirect back to our callback URL with the payment confirmation.

This flow is simulated in this example.
`,
    ),
  )

  await waitForEnter("Press Enter to initiate the Stripe payment...")

  log(colors.dim("Initiating Stripe payment flow..."))

  // Step 1: Get the Stripe payment URL from the payment service
  const response1 = await fetch(paymentServiceUrl, {
    method: "POST",
    body: JSON.stringify({
      paymentOptionId: paymentOption.id,
      paymentRequestToken,
    }),
  })

  if (!response1.ok) {
    throw new Error(errorMessage("Failed to get Stripe payment URL"))
  }

  const { paymentUrl } = (await response1.json()) as { paymentUrl: string }

  log(
    successMessage("Stripe payment URL generated successfully! 🚀"),
    colors.dim("\nSample Stripe payment URL:"),
    colors.cyan(paymentUrl),
    { wrap: false },
  )
  log(
    colors.magenta(
      "\n💡 In a real implementation, this would open in a browser for the agent or user to complete the payment.",
    ),
  )

  // Extract the return_to URL from the payment URL
  const returnToUrl = new URL(paymentUrl).searchParams.get("return_to")
  if (!returnToUrl) {
    throw new Error(
      errorMessage("Invalid payment URL - missing return_to parameter"),
    )
  }

  log(colors.dim("\n⏳ Simulating successful payment and callback..."))

  await waitForEnter("Press Enter to simulate payment completion...")

  // Step 2: Simulate the callback from Stripe with payment confirmation
  const response2 = await fetch(returnToUrl, {
    method: "POST",
    body: JSON.stringify({
      paymentOptionId: paymentOption.id,
      paymentRequestToken,
      metadata: {
        eventId: "evt_" + Math.random().toString(36).substring(7), // Simulated Stripe event ID
      },
    }),
  })

  if (!response2.ok) {
    throw new Error(errorMessage("Failed to process payment callback"))
  }

  const { receipt, details } = (await response2.json()) as {
    receipt: string
    details: Verifiable<PaymentReceiptCredential>
  }

  return { receipt, details }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0)
  })
