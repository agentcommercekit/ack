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
  wordWrap
} from "@repo/cli-tools"
import {
  addressFromDidPkhUri,
  createJwt,
  getDidResolver,
  isDidPkhUri,
  isJwtString,
  parseJwtCredential,
  verifyPaymentToken
} from "agentcommercekit"
import { isAddress, getAddress, erc20Abi as viemErc20Abi, encodeFunctionData, Hex, createWalletClient, http, toHex } from "viem"
import { signTypedData } from "viem/actions"
import {
  SERVER_URL,
  chain,
  chainId,
  publicClient,
  usdcAddress,
  X402_FACILITATOR_URL,
  X402_FACILITATOR_SPENDER_ADDRESS
} from "./constants"
import { ensureNonZeroBalances } from "./utils/ensure-balances"
import { ensurePrivateKey } from "./utils/ensure-private-keys"
import { getKeypairInfo } from "./utils/keypair-info"
import type { KeypairInfo } from "./utils/keypair-info"
import type {
  JwtString,
  PaymentReceiptCredential,
  Verifiable
} from "agentcommercekit"
import "./server"
import "./receipt-service"
import "./payment-service"
import { randomBytes } from "crypto"

// Define constants for payment option IDs
const LOGISTICS_PAYMENT_OPTION_ID = "usdc-logistics-check-v1"
const WARRANTY_PAYMENT_OPTION_ID = "usdc-warranty-check-v1"
const PURCHASE_PAYMENT_OPTION_ID = "stripe-watch-purchase-v1"

// Initialize variables for receipts with empty strings
let logisticsReceipt: string = ""
let warrantyReceipt: string = ""
let purchaseReceipt: string = ""

// Helper to convert network format
// Ideally, this mapping should be imported or derived from the x402 package if possible,
// but for now, we'll define it based on the observed schema.
const chainIdToX402Network = (caip2Id: string): "base-sepolia" | "base" | "avalanche-fuji" | "avalanche" | undefined => {
  const numericId = parseInt(caip2Id.split(":")[1], 10);
  const mapping: Record<number, "base-sepolia" | "base" | "avalanche-fuji" | "avalanche"> = {
    84532: "base-sepolia",
    8453: "base",
    43113: "avalanche-fuji",
    43114: "avalanche"
  };
  return mapping[numericId];
};

// Define an ABI that includes the 'nonces' function for EIP-2612 permit
const usdcPermitAbi = [
  ...viemErc20Abi, // Includes standard ERC20 functions like name, symbol, decimals, balanceOf, etc.
  {
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    name: "nonces",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name", // Or "NAME" if that's what your USDC contract uses for permit domain
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Add 'version' if your USDC contract exposes it via a view function for the domain separator
  // {
  //   inputs: [],
  //   name: "version", // Or "VERSION"
  //   outputs: [{ name: "", type: "string", internalType: "string" }],
  //   stateMutability: "view",
  //   type: "function"
  // }
] as const;

/**
 * Example showcasing payments using the ACK-Pay protocol.
 */
async function main() {
  console.clear()
  log(demoHeader("ACK-Pay"), { wrap: false })
  log(
      colors.bold(
          colors.magenta("\n✨ === Agent-Native Payments Protocol Demo === ✨")
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
`)
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
        ensurePrivateKey("PAYMENT_SERVICE_PRIVATE_KEY_HEX")
      ])

  const clientKeypairInfo = await getKeypairInfo(clientPrivateKeyHex)
  const serverKeypairInfo = await getKeypairInfo(serverPrivateKeyHex)

  log(
      `
Using the following public keys:

${colors.bold("Client:")} ${colors.dim(clientKeypairInfo.publicKeyHex)}
${colors.bold("Server:")} ${colors.dim(serverKeypairInfo.publicKeyHex)}
`,
      { wrap: false }
  )

  // Step 1: Logistics Check
  log(sectionHeader("🚚 Logistics Check"))
  log(colors.dim("Client requests logistics quote from Server..."))
  const logisticsResponse = await fetch(`${SERVER_URL}/logistics/quote`, {
    method: "POST"
  })

  if (logisticsResponse.status === 402) {
    const { paymentToken } = await logisticsResponse.json()
    log(successMessage("Logistics payment required. Proceeding with payment..."))
    const logisticsResult = await performOnChainPayment(clientKeypairInfo, paymentToken, LOGISTICS_PAYMENT_OPTION_ID)
    logisticsReceipt = logisticsResult.receipt
    log(successMessage("Logistics payment completed and receipt obtained."))

    // Now, make the request again with the receipt to get the success message
    log(colors.dim("\nClient re-requesting logistics quote with receipt..."))
    const logisticsResponseWithReceipt = await fetch(`${SERVER_URL}/logistics/quote`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${logisticsReceipt}`
      }
    })
    if (logisticsResponseWithReceipt.ok) {
      const quoteData = await logisticsResponseWithReceipt.json()
      log(successMessage("Server response for logistics quote:"))
      log(colors.green(`  -> ${quoteData.message}`))
    } else {
      log(errorMessage("Failed to get logistics quote even with receipt. Status: " + logisticsResponseWithReceipt.status))
      const errorData = await logisticsResponseWithReceipt.text()
      log(colors.red(errorData))
    }

  } else {
    throw new Error("Unexpected response from logistics endpoint.")
  }

  // Step 2: Warranty Check
  log(sectionHeader("🔍 Warranty Check"))
  log(colors.dim("Client requests warranty check from Server..."))
  const warrantyResponse = await fetch(`${SERVER_URL}/warranty/check`, {
    method: "POST"
  })

  if (warrantyResponse.status === 402) {
    const { paymentToken } = await warrantyResponse.json()
    log(successMessage("Warranty payment required. Proceeding with payment..."))
    const warrantyResult = await performOnChainPayment(clientKeypairInfo, paymentToken, WARRANTY_PAYMENT_OPTION_ID)
    warrantyReceipt = warrantyResult.receipt
    log(successMessage("Warranty payment completed and receipt obtained."))

    // Now, make the request again with the receipt to get the success message
    log(colors.dim("\nClient re-requesting warranty check with receipt..."))
    const warrantyResponseWithReceipt = await fetch(`${SERVER_URL}/warranty/check`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${warrantyReceipt}`
      }
    })
    if (warrantyResponseWithReceipt.ok) {
      const checkData = await warrantyResponseWithReceipt.json()
      log(successMessage("Server response for warranty check:"))
      log(colors.green(`  -> ${checkData.message}`))
    } else {
      log(errorMessage("Failed to get warranty check even with receipt. Status: " + warrantyResponseWithReceipt.status))
      const errorData = await warrantyResponseWithReceipt.text()
      log(colors.red(errorData))
    }

  } else {
    throw new Error("Unexpected response from warranty endpoint.")
  }

  // Step 3: Purchase Order
  log(sectionHeader("🛒 Purchase Order"))
  log(colors.dim("Client requests to purchase the watch from Server..."))
  const purchaseResponse = await fetch(`${SERVER_URL}/purchase/order`, {
    method: "POST",
    headers: {
      "X-Logistics-Receipt": logisticsReceipt,
      "X-Warranty-Receipt": warrantyReceipt
    }
  })

  if (purchaseResponse.status === 402) {
    const { paymentToken } = await purchaseResponse.json()
    log(successMessage("Purchase payment required. Proceeding with payment..."))
    const purchaseResult = await performStripePayment(clientKeypairInfo, paymentToken, PURCHASE_PAYMENT_OPTION_ID)
    purchaseReceipt = purchaseResult.receipt
    log(successMessage("Purchase payment completed and receipt obtained."))
  } else {
    throw new Error("Unexpected response from purchase endpoint.")
  }

  log(successMessage("All steps completed successfully!"))
}

async function performOnChainPayment(
    client: KeypairInfo,
    paymentRequestJwt: JwtString,
    selectedPaymentOptionId: string
) {
  const didResolver = getDidResolver()
  const { paymentRequest } = await verifyPaymentToken(paymentRequestJwt, {
    resolver: didResolver
  })

  const paymentOption = paymentRequest.paymentOptions.find(
      (option) => option.id === selectedPaymentOptionId
  )

  if (!paymentOption) {
    throw new Error(
        errorMessage(
            `Payment option with ID "${selectedPaymentOptionId}" not found in payment token.`
        )
    )
  }
  if (paymentOption.network !== chainId) {
    throw new Error(errorMessage(`This function only supports on-chain payments for the demo's configured chainId (${chainId}). Selected option is for ${paymentOption.network}.`))
  }

  const receiptServiceUrl = paymentOption.receiptService
  if (!receiptServiceUrl) {
    throw new Error(
        errorMessage(
            "Receipt service URL is required in the selected payment option."
        )
    )
  }

  log(colors.dim("🔍 Checking client wallet balances for USDC (gas will be paid by facilitator)..."))
  await ensureNonZeroBalances(chain, client.crypto.address, usdcAddress)
  log(
      successMessage(
          "USDC balance verified! Client has sufficient USDC for payment. ✅\n"
      )
  )

  // --- Resolve recipient address before signing ---
  const payToAddressUri = paymentOption.recipient
  let finalRecipientAddress: string
  if (isDidPkhUri(payToAddressUri)) {
    finalRecipientAddress = addressFromDidPkhUri(payToAddressUri)
  } else if (isAddress(payToAddressUri)) {
    finalRecipientAddress = payToAddressUri
  } else {
    throw new Error(errorMessage(`Invalid recipient address format: ${payToAddressUri}`))
  }

  log(
      sectionHeader(
          "✍️ Client Prepares & Signs Authorization (Authorizing Facilitator)"
      )
  )
  log(
      colors.dim(
          `${colors.bold("Client Agent 👤 -> Signs EIP-712 Message (TransferWithAuthorization)")}

The Client Agent will now create and sign an EIP-712 'TransferWithAuthorization' message. This message authorizes the x402 Facilitator (spender: ${X402_FACILITATOR_SPENDER_ADDRESS}) to use its funds for the payment of ${paymentOption.amount / (10 ** paymentOption.decimals)} USDC from the client's wallet (${client.crypto.address}). This signature does NOT initiate a transaction or cost gas for the client.
It's an off-chain authorization that will be submitted to the blockchain by the Facilitator.`
      )
  )

  await waitForEnter("Press Enter to sign the authorization message...")

  // The nonce for `transferWithAuthorization` must be a unique `bytes32` value to prevent replay attacks.
  // We generate a random one here. This is different from the sequential `uint256` nonce used by the `permit` function.
  const nonceForSigning = `0x${randomBytes(32).toString("hex")}` as Hex;
  log(colors.dim(`Generated random nonce for signing: ${nonceForSigning}`))

  // Facilitator logs indicate it expects domain name 'USDC'
  const tokenNameForDomain = "USDC";

  const domain = {
    name: tokenNameForDomain,
    version: "2", // Ensure this version matches what the USDC contract expects for this type of signature
    chainId: BigInt(publicClient.chain.id),
    verifyingContract: usdcAddress
  } as const

  // EIP-712 types expected by the facilitator for TransferWithAuthorization
  const transferAuthorisationTypes = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" } // Facilitator expects bytes32 nonce in the message
    ]
  } as const;

  // Set validAfter to 60 seconds in the past to avoid clock skew issues with the blockchain.
  const validAfterTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
  const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour deadline

  const messageToSign = {
    from: client.crypto.address,
    to: getAddress(finalRecipientAddress), // The recipient of the funds
    value: BigInt(paymentOption.amount),
    validAfter: validAfterTimestamp,
    validBefore: deadlineTimestamp,
    nonce: nonceForSigning
  };

  log(colors.dim("Message to be signed (TransferWithAuthorization):"), colors.cyan(JSON.stringify({ domain, types: transferAuthorisationTypes, primaryType: 'TransferWithAuthorization', message: messageToSign }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)))

  const walletClient = createWalletClient({
    account: client.crypto.account,
    chain: publicClient.chain,
    transport: http()
  })

  const signature = await signTypedData(walletClient, {
    domain,
    types: transferAuthorisationTypes,
    primaryType: "TransferWithAuthorization",
    message: messageToSign
  })
  log(successMessage("TransferWithAuthorization message signed by client."))
  log(colors.dim(`Signature: ${signature}`))

  log(
      sectionHeader(
          "💸 Client Requests Payment Execution (Client Agent -> x402 Facilitator)"
      )
  )
  log(
      colors.dim(
          `${colors.bold("Client Agent 👤 -> x402 Facilitator 💳")}

The Client Agent now sends the signed 'TransferWithAuthorization' message (via the signature and authorization object), along with payment requirements, to the x402 Facilitator's /settle endpoint (${X402_FACILITATOR_URL}/settle). The Facilitator will use this authorization to execute the USDC transfer on behalf of the client and will pay the associated blockchain gas fees.`
      )
  )
  await waitForEnter("Press Enter to send request to x402 Facilitator...")

  const x402NetworkString = chainIdToX402Network(paymentOption.network);
  if (!x402NetworkString) {
    throw new Error(errorMessage(`Unsupported network ID for x402 Facilitator: ${paymentOption.network}`));
  }

  const x402Authorization = {
    from: messageToSign.from,
    to: messageToSign.to,
    value: messageToSign.value.toString(),
    validAfter: messageToSign.validAfter.toString(),
    validBefore: messageToSign.validBefore.toString(),
    nonce: messageToSign.nonce // This is already a hex string (bytes32)
  };

  const x402EvmPayload = {
    signature: signature,
    authorization: x402Authorization
  };

  const x402PaymentPayload = {
    x402Version: 1,
    scheme: "exact" as const,
    network: x402NetworkString!,
    payload: x402EvmPayload
  };

  // --- Construct x402PaymentRequirements ---
  // finalRecipientAddress is now calculated before signing
  const descriptionForRequirements = paymentRequest.description || `Payment for option ${paymentOption.id}`;
  // Use paymentOption.receiptService as resource URL, or a more specific one if available
  // For example, if paymentRequest.serviceCallback is a URL and more appropriate.
  // Using paymentOption.receiptService ensures a URL is present.
  const resourceForRequirements = paymentOption.receiptService || `${SERVER_URL}/unknown_resource`;

  const x402PaymentRequirements = {
    scheme: "exact" as const,
    network: x402NetworkString!,
    maxAmountRequired: paymentOption.amount.toString(),
    resource: resourceForRequirements,
    description: descriptionForRequirements,
    mimeType: "application/json",
    payTo: finalRecipientAddress,
    maxTimeoutSeconds: 60,
    asset: usdcAddress,
    extra: { // For EIP-712 domain details, matching what was signed
      name: tokenNameForDomain,
      version: domain.version // Use the same version as in the signed domain
    }
  };

  log(colors.dim("Sending to x402 Facilitator /settle:"), colors.cyan(JSON.stringify({ paymentPayload: x402PaymentPayload, paymentRequirements: x402PaymentRequirements }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)))

  const facilitatorResponse = await fetch(`${X402_FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentPayload: x402PaymentPayload,
      paymentRequirements: x402PaymentRequirements
    })
  })

  if (!facilitatorResponse.ok) {
    const errorBody = await facilitatorResponse.text()
    log(colors.red(`Error from x402 Facilitator (${facilitatorResponse.status}): ${errorBody}`))
    throw new Error(
        errorMessage(`Failed to settle payment via x402 Facilitator. Status: ${facilitatorResponse.status}`)
    )
  }

  const facilitatorJson = await facilitatorResponse.json()
  console.log("facilitatorJson", facilitatorJson)
  const settlementTxHash = facilitatorJson.transaction as Hex
  if (!settlementTxHash || !/^0x[0-9a-fA-F]{64}$/.test(settlementTxHash)) {
    log(colors.red("Invalid transactionHash received from x402 Facilitator:"), facilitatorJson)
    throw new Error(errorMessage("Invalid or missing transactionHash from x402 Facilitator."))
  }

  log(successMessage("Payment successfully settled by x402 Facilitator! 🚀"))
  log("Settlement Transaction Hash:", colors.cyan(settlementTxHash))
  log(colors.dim("View on BaseScan:"))
  log(link(`https://sepolia.basescan.org/tx/${settlementTxHash}`), { wrap: false })

  log(
      sectionHeader(
          "🧾 Obtain Verifiable Receipt (Client Agent -> Your Receipt Service)"
      )
  )
  log(
      colors.dim(
          `${colors.bold("Client Agent 👤 -> Your Receipt Service 🧾")}

With the payment settled by the x402 Facilitator, the Client Agent now requests a formal, cryptographically verifiable payment receipt from Your Receipt Service. The Client sends the original 'paymentToken', the 'paymentOptionId', and the 'settlementTxHash' (obtained from the Facilitator) to the Receipt Service. The Client also signs this request with its own DID.`
      )
  )
  await waitForEnter("Press Enter to request the verifiable receipt from Your Receipt Service...")

  log(colors.dim("✍️ Creating a signed payload (JWT) for Your Receipt Service..."))

  const receiptServicePayload = {
    paymentToken: paymentRequestJwt,
    paymentOptionId: paymentOption.id,
    metadata: {
      txHash: settlementTxHash,
      network: chainId
    },
    payerDid: client.did
  }

  const signedPayloadForReceiptService = await createJwt(receiptServicePayload, {
    issuer: client.did,
    signer: client.jwtSigner
  })

  log(colors.dim(`Submitting to Your Receipt Service (${receiptServiceUrl})...`))
  const receiptServiceApiResponse = await fetch(receiptServiceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: signedPayloadForReceiptService
    })
  })

  if (!receiptServiceApiResponse.ok) {
    const errorBody = await receiptServiceApiResponse.text()
    log(colors.red(`Error from Receipt Service (${receiptServiceApiResponse.status}): ${errorBody}`))
    throw new Error(errorMessage(`Failed to get receipt from Receipt Service. Status: ${receiptServiceApiResponse.status}`))
  }

  const { receipt, details } = (await receiptServiceApiResponse.json()) as {
    receipt: string
    details: Verifiable<PaymentReceiptCredential>
  }
  log(successMessage("Verifiable Receipt obtained successfully from Your Receipt Service! ✅"))

  return { receipt, details }
}

function parseSignature(signature: Hex): { r: Hex; s: Hex; v: bigint } {
  const sig = signature.substring(2);
  const r = `0x${sig.substring(0, 64)}` as Hex;
  const s = `0x${sig.substring(64, 128)}` as Hex;
  const v = BigInt(`0x${sig.substring(128, 130)}`);
  return { r, s, v };
}

async function performStripePayment(
    _client: KeypairInfo,
    paymentRequestJwt: JwtString,
    selectedPaymentOptionId: string
) {
  const didResolver = getDidResolver()
  const { paymentRequest } = await verifyPaymentToken(paymentRequestJwt, {
    resolver: didResolver
  })

  const paymentOption = paymentRequest.paymentOptions.find(
      (option) => option.id === selectedPaymentOptionId
  )

  if (!paymentOption) {
    throw new Error(
        errorMessage(
            `Payment option with ID "${selectedPaymentOptionId}" not found in payment token.`
        )
    )
  }

  const paymentServiceUrl = paymentOption.paymentService
  if (!paymentServiceUrl) {
    throw new Error(
        errorMessage(
            "Payment service URL is required in the selected payment option."
        )
    )
  }

  log(
      sectionHeader(
          "💸 Execute Payment (Client Agent -> Payment Service / Stripe)"
      )
  )
  log(
      colors.dim(
          `${colors.bold("Client Agent 👤 -> Payment Service 💳 -> Stripe")}

The Client Agent now uses the details from the Payment Request to initiate a Stripe payment. The Payment Service will generate a Stripe payment URL where the payment can be completed. After successful payment, Stripe will redirect back to our callback URL with the payment confirmation.

This flow is simulated in this example.
`
      )
  )

  await waitForEnter("Press Enter to initiate the Stripe payment...")

  log(colors.dim("Initiating Stripe payment flow..."))

  const response1 = await fetch(paymentServiceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentOptionId: paymentOption.id,
      paymentToken: paymentRequestJwt
    })
  })

  if (!response1.ok) {
    const errorBody = await response1.text()
    log(colors.red(`Failed to get Stripe payment URL (${response1.status}): ${errorBody}`))
    throw new Error(errorMessage("Failed to get Stripe payment URL"))
  }

  const { paymentUrl } = (await response1.json()) as { paymentUrl: string }

  log(
      successMessage("Stripe payment URL generated successfully! 🚀"),
      colors.dim("\nSample Stripe payment URL:"),
      colors.cyan(paymentUrl),
      { wrap: false }
  )
  log(
      colors.magenta(
          "\n💡 In a real implementation, this would open in a browser for the agent or user to complete the payment."
      )
  )

  // Extract the return_to URL from the payment URL
  const returnToUrl = new URL(paymentUrl).searchParams.get("return_to")
  if (!returnToUrl) {
    throw new Error(
        errorMessage("Invalid payment URL - missing return_to parameter")
    )
  }

  log(colors.dim("\n⏳ Simulating successful payment and callback..."))

  await waitForEnter("Press Enter to simulate payment completion...")

  // Step 2: Simulate the callback from Stripe with payment confirmation
  const response2 = await fetch(returnToUrl, {
    method: "POST",
    body: JSON.stringify({
      paymentOptionId: paymentOption.id,
      paymentToken: paymentRequestJwt,
      metadata: {
        eventId: "evt_" + Math.random().toString(36).substring(7) // Simulated Stripe event ID
      }
    })
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

