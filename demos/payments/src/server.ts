import { serve } from "@hono/node-server"
import { logger } from "@repo/api-utils/middleware/logger"
import { cors } from 'hono/cors';
import {colors, errorMessage, log, successMessage, logJson, sectionHeader, waitForEnter, link} from "@repo/cli-tools"
import {
  createPaymentRequestResponse,
  getDidResolver,
  verifyPaymentReceipt,
  verifyJwt, type JwtString, verifyPaymentToken, isDidPkhUri, addressFromDidPkhUri, createJwt
} from "agentcommercekit"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import {
  PAYMENT_SERVICE_URL,
  RECEIPT_SERVICE_URL,
  chainId,
  chain,
  usdcAddress,
  X402_FACILITATOR_SPENDER_ADDRESS, publicClient, X402_FACILITATOR_URL, SERVER_URL
} from "./constants"
import {getKeypairInfo, type KeypairInfo} from "./utils/keypair-info"
import type { PaymentRequestInit, Verifiable, PaymentReceiptCredential } from "agentcommercekit"
import type { Env, Context } from "hono"
import 'dotenv/config';
import {ensureNonZeroBalances} from "@/utils/ensure-balances";
import {createWalletClient, getAddress, Hex, http, isAddress} from "viem";
import {randomBytes} from "crypto";
import {signTypedData} from "viem/actions";
import {ensurePrivateKey} from "@/utils/ensure-private-keys";
import { privateKeyToAccount } from "viem/accounts"




const app = new Hono<Env>()
app.use(logger())
app.use('*', cors());


type Env = {
  Variables: {
    SERVER_PRIVATE_KEY_HEX: string;
    CLIENT_PRIVATE_KEY_HEX: string;
    RECEIPT_SERVICE_PRIVATE_KEY_HEX: string;
    PAYMENT_SERVICE_PRIVATE_KEY_HEX: string;
  };
};

app.use('*', async (c, next) => {
  c.env = {
    ...c.env,
    SERVER_PRIVATE_KEY_HEX: process.env.SERVER_PRIVATE_KEY_HEX!,
    CLIENT_PRIVATE_KEY_HEX: process.env.CLIENT_PRIVATE_KEY_HEX!,
    RECEIPT_SERVICE_PRIVATE_KEY_HEX: process.env.RECEIPT_SERVICE_PRIVATE_KEY_HEX!,
    PAYMENT_SERVICE_PRIVATE_KEY_HEX: process.env.PAYMENT_SERVICE_PRIVATE_KEY_HEX!,
  };
  await next();
});

const env = (c: Context) => c.env;


// Constants for payment option IDs
const LOGISTICS_PAYMENT_OPTION_ID = "usdc-logistics-check-v1"
const WARRANTY_PAYMENT_OPTION_ID = "usdc-warranty-check-v1"
const PURCHASE_PAYMENT_OPTION_ID = "stripe-watch-purchase-v1"

const [clientPrivateKeyHex, serverPrivateKeyHex, ..._rest] =
    await Promise.all([
      ensurePrivateKey("CLIENT_PRIVATE_KEY_HEX"),
      ensurePrivateKey("SERVER_PRIVATE_KEY_HEX"),
      ensurePrivateKey("RECEIPT_SERVICE_PRIVATE_KEY_HEX"),
      ensurePrivateKey("PAYMENT_SERVICE_PRIVATE_KEY_HEX")
    ])

const clientKeypairInfo = await getKeypairInfo(clientPrivateKeyHex)
const serverKeypairInfo = await getKeypairInfo(serverPrivateKeyHex)

const laptops = {
  "laptop-1": {
    name: 'Machenike Machcreator N17A Laptop, 17.3" FHD 120Hz, Intel N100, 16GB DDR5, 1TB SSD, W11P, Grey',
    price: 449,
    rating: 4.0,
    reviews: 150,
    image: "/images/laptop-1.png",
    deliveryEstimate: 5,
    deliveryMethod: "FedEx Ground Shipping",
    warranty: "AUTH",
    availability: "BestBuy (180 10th St NJ), In stock: 7 | Micro Center (456 7th Ave, NY), In stock: 10"
  },
  "laptop-2": {
    name: "RNRUO 14 inch Windows 11 Laptops New Intel Celeron N4000 2.6Ghz 8GB RAM 256GB ROM Notebook PC Computer Laptop for Beginner, Student, Business",
    price: 180.39,
    rating: 3.6,
    reviews: 326,
    image: "/images/laptop-2.png",
    deliveryEstimate: 4,
    deliveryMethod: "UPS",
    warranty: "AUTH",
    availability: "Out of Stock in NY/NJ area"
  },
  "laptop-3": {
    name: 'Machenike Machcreator N17A Laptop, 17.3" FHD 120Hz, Intel N100, 8GB DDR5, 256GB SSD, W11H, Grey',
    price: 359,
    rating: 1,
    reviews: 2,
    image: "/images/laptop-3.png",
    deliveryEstimate: 6,
    deliveryMethod: "USPS Ground Shipping",
    warranty: "AUTH",
    availability: "Fry's Electronics (180 10th St NJ), In stock: 8 | Best Buy (456 7th Ave, NY), In stock: 15"
  },
  "laptop-4": {
    name: "HP 255 G10 15.6 FHD Notebook Laptop, AMD Ryzen 5 7530U (Beats i7-1165G7),16GB RAM - 512GB PCIe SSD, Webcam, WiFi 6, Bluetooth 5.3, Windows 11 Pro & Office Pro Lifetime License",
    price: 479.99,
    rating: 5,
    reviews: 10,
    image: "/images/laptop-4.png",
    deliveryEstimate: 3,
    deliveryMethod: "Ebay Shipping Service",
    warranty: "NO AUTH",
    availability: "Costco (869 10th St NJ), In stock: 1 | Micro Center (456 7th Ave, NY), In stock: 6"
  }
}



const watches = {
  'laptop-1': {
    name: 'Swatch Mission to the Moon',
    deliveryEstimate: 5,
    deliveryMethod: "FedEx Ground Shipping",
    warranty: "AUTH"
  },
  'laptop-2': {
    name: 'Guess Charlotte for women',
    deliveryEstimate: 4,
    deliveryMethod: "UPS Ground Shipping",
    warranty: "NO AUTH"
  },
  'laptop-3': {
    name: 'Fossil leather watch for men',
    deliveryEstimate: 6,
    deliveryMethod: "USPS",
    warranty: "AUTH"
  },
  'laptop-4': {
    name: 'Fossil leather watch for men',
    deliveryEstimate: 6,
    deliveryMethod: "USPS",
    warranty: "AUTH"
  }
}



// console.log(clientKeypairInfo.keypair.privateKey +  " " + serverKeypairInfo.keypair.privateKey)
/**
 * Simple hono error handler
 */
app.onError((e, c) => {
  if (e instanceof HTTPException) {
    return e.getResponse()
  }

  console.error(colors.red("Error in server:"), e)
  return c.json({ error: e.message }, 500)
})

// Helper to generate payment request init
const createServicePaymentRequest = (
    serverDid: string,
    serverAddress: string,
    paymentOptionId: string,
    amount: number, // in subunits
    currency: string,
    decimals: number,
    network: string,
    receiptSvcUrl: string
): PaymentRequestInit => ({
  id: crypto.randomUUID(),
  paymentOptions: [
    {
      id: paymentOptionId,
      amount,
      decimals,
      currency,
      recipient: network === "stripe" ? serverDid : serverAddress,
      network,
      receiptService: receiptSvcUrl,
      ...(network === "stripe" && { paymentService: PAYMENT_SERVICE_URL }),
    },
  ],
})

// Helper to verify a receipt and its specific paymentOptionId
async function verifyServiceReceipt(
    receiptJwt: string,
    expectedPaymentOptionId: string,
    c: any // Hono context
): Promise<Verifiable<PaymentReceiptCredential> | null> {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX)
  const didResolver = getDidResolver()
  const { did: receiptIssuerDid } = await getKeypairInfo(
      env(c).RECEIPT_SERVICE_PRIVATE_KEY_HEX // This is the DID of the receipt service we trust
  )
  const trustedReceiptIssuers: string[] = [receiptIssuerDid]

  try {
    // Step 1: Verify the overall receipt validity (signature, issuer, embedded payment token)
    await verifyPaymentReceipt(receiptJwt, {
      resolver: didResolver,
      trustedReceiptIssuers,
      paymentRequestIssuer: serverIdentity.did, // This server issued the original payment request
      verifyPaymentTokenJwt: true,
    })

    // Step 2: Decode the JWT to inspect its payload for the paymentOptionId
    const decodedVcPayload = (await verifyJwt(receiptJwt, {
      resolver: didResolver,
      policies: { aud: false },
    })).payload as any;

    log(colors.yellow("Server: Decoded VC payload for receipt verification:"));
    logJson(decodedVcPayload);

    // Adjust access to credentialSubject and paymentOptionId
    const credentialSubject = decodedVcPayload?.vc?.credentialSubject;

    if (credentialSubject) {
      log(colors.yellow(`Server: Credential Subject paymentOptionId: ${credentialSubject.paymentOptionId}`));
    } else {
      log(colors.red("Server: Credential Subject (decodedVcPayload.vc.credentialSubject) is undefined in decoded VC."));
    }

    if (credentialSubject?.paymentOptionId !== expectedPaymentOptionId) {
      log(errorMessage(`Receipt paymentOptionId mismatch. Expected ${expectedPaymentOptionId}, got ${credentialSubject?.paymentOptionId}`))
      return null
    }
    // Cast to the expected return type if everything is okay,
    // though the structure of decodedVcPayload is not exactly Verifiable<PaymentReceiptCredential>
    // This might need further type adjustments based on agentcommercekit's actual structures.
    // For now, the goal is to make the logic work.
    return decodedVcPayload.vc as Verifiable<PaymentReceiptCredential>; // Or adjust as needed
  } catch (e) {
    log(errorMessage("Error verifying service receipt"), String(e))
    return null
  }
}

// New endpoint for fetching reviews
app.post("/logistics/reviews", async (c) => {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX);
  const { laptopIds } = await c.req.json(); // Get laptopIds from the request body

  if (!laptopIds || !Array.isArray(laptopIds) || laptopIds.length === 0) {
    return c.json(
        {
          error: 'Missing or invalid "laptopIds" array in request body.',
        },
        400 // Bad Request
    );
  }

  const receipt = c.req.header("Authorization")?.replace("Bearer ", "");

  if (receipt) {
    const verifiedReceipt = await verifyServiceReceipt(receipt, LOGISTICS_PAYMENT_OPTION_ID, c);
    if (verifiedReceipt) {
      log(successMessage("Logistics receipt verified successfully for reviews"));
      const reviewData = {};
      laptopIds.forEach(laptopId => {
        if (laptops[laptopId]) {
          reviewData[laptopId] = {
            rating: laptops[laptopId].rating,
            reviews: laptops[laptopId].reviews
          };
        } else {
          reviewData[laptopId] = { message: "Laptop ID not found." };
        }
      });
      return c.json({ message: "Review data fetched successfully.", data: reviewData });
    } else {
      throw new HTTPException(400, { message: "Invalid or incorrect logistics receipt." });
    }
  } else {
    log(colors.yellow("No logistics receipt found for reviews, generating payment request..."));
    const paymentRequestInit = createServicePaymentRequest(
        serverIdentity.did,
        serverIdentity.crypto.address,
        LOGISTICS_PAYMENT_OPTION_ID,
        40000, // $0.04 USDC (6 decimals)
        "USDC",
        6,
        chainId, // eip155:84532 (Base Sepolia)
        RECEIPT_SERVICE_URL
    );
    const paymentRequest402Response = await createPaymentRequestResponse(
        paymentRequestInit,
        {
          issuer: serverIdentity.did,
          signer: serverIdentity.jwtSigner,
          algorithm: serverIdentity.keypair.algorithm,
        }
    );
    log(successMessage("Logistics payment request generated for reviews"));
    const logisticsPaymentRequestJson = await paymentRequest402Response.clone().json();
    logJson(logisticsPaymentRequestJson);
    throw new HTTPException(402, { res: paymentRequest402Response });
  }
});

// New endpoint for fetching availability
app.post("/logistics/availability", async (c) => {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX);
  const { laptopIds } = await c.req.json(); // Get laptopIds from the request body

  if (!laptopIds || !Array.isArray(laptopIds) || laptopIds.length === 0) {
    return c.json(
        {
          error: 'Missing or invalid "laptopIds" array in request body.',
        },
        400 // Bad Request
    );
  }

  const receipt = c.req.header("Authorization")?.replace("Bearer ", "");

  if (receipt) {
    console.log("receipt", receipt)
    const verifiedReceipt = await verifyServiceReceipt(receipt, LOGISTICS_PAYMENT_OPTION_ID, c);
    if (verifiedReceipt) {
      log(successMessage("Logistics receipt verified successfully for availability"));
      const availabilityData = {};
      laptopIds.forEach(laptopId => {
        if (laptops[laptopId]) {
          availabilityData[laptopId] = {
            availability: laptops[laptopId].availability
          };
        } else {
          availabilityData[laptopId] = { message: "Laptop ID not found." };
        }
      });
      return c.json({ message: "Availability data fetched successfully.", data: availabilityData });
    } else {
      throw new HTTPException(400, { message: "Invalid or incorrect logistics receipt." });
    }
  } else {
    log(colors.yellow("No logistics receipt found for availability, generating payment request..."));
    const paymentRequestInit = createServicePaymentRequest(
        serverIdentity.did,
        serverIdentity.crypto.address,
        LOGISTICS_PAYMENT_OPTION_ID,
        50000, // $0.04 USDC (6 decimals)
        "USDC",
        6,
        chainId, // eip155:84532 (Base Sepolia)
        RECEIPT_SERVICE_URL
    );
    const paymentRequest402Response = await createPaymentRequestResponse(
        paymentRequestInit,
        {
          issuer: serverIdentity.did,
          signer: serverIdentity.jwtSigner,
          algorithm: serverIdentity.keypair.algorithm,
        }
    );
    log(successMessage("Logistics payment request generated for availability"));
    const logisticsPaymentRequestJson = await paymentRequest402Response.clone().json();
    logJson(logisticsPaymentRequestJson);
    throw new HTTPException(402, { res: paymentRequest402Response });
  }
});



app.get("/get-laptops", async (c) => {
  const items = Object.entries(laptops).map(([id, data]) => ({
    id,
    name: data.name,
    price: data.price
  }));

  return c.json({ items });
});

app.get("/get-laptops/:laptopId", async (c) => {
  const laptopId = await c.req.param("laptopId");

const items = Object.entries(laptops)
  .filter(([id]) => id === laptopId)
  .map(([id, data]) => ({
    id,
    name: data.name,
    price: data.price
  }));

return c.json({ items });

});


// --- ADDED: Placeholder for Base Sepolia Etherscan verification function ---
async function verifyTransactionOnBaseSepoliaEtherscan(transactionHash: string): Promise<boolean> {
  // This is a placeholder. You need to implement the actual logic here.
  // This function should:
  // 1. Call the Base Sepolia Etherscan API (e.g., 'https://api-sepolia.basescan.org/api').
  // 2. Check if the transaction hash exists and is confirmed.
  // 3. Optionally, verify if the transaction transferred the correct amount to the expected recipient address.
  console.log(`[Placeholder] Verifying transaction hash: ${transactionHash} on Base Sepolia Etherscan...`);
  // For demonstration, let's assume it's always verified if a hash is present.
  // In a real application, you would make an actual API call.
  if (transactionHash.length > 0) { // Simple check, replace with actual API call
    return true;
  }
  return false;

}
// Endpoint for Warranty Check


// Endpoint for Watch Purchase
app.post("/purchase/order", async (c) => {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX)
  log(colors.bold("\nServer: Processing /purchase/order request"))

  // Step 1: Verify prerequisite receipts
  const logisticsReceiptJwt = c.req.header("X-Logistics-Receipt")
  const warrantyReceiptJwt = c.req.header("X-Warranty-Receipt")

  if (!logisticsReceiptJwt || !warrantyReceiptJwt) {
    throw new HTTPException(400, { message: "Logistics and Warranty receipts are required in X-Logistics-Receipt and X-Warranty-Receipt headers." })
  }

  log(colors.dim("Verifying logistics receipt..."))
  const verifiedLogisticsReceipt = await verifyServiceReceipt(logisticsReceiptJwt, LOGISTICS_PAYMENT_OPTION_ID, c)
  if (!verifiedLogisticsReceipt) {
    throw new HTTPException(400, { message: "Invalid or incorrect Logistics receipt." })
  }
  log(successMessage("Logistics receipt verified successfully for purchase."))

  log(colors.dim("Verifying warranty receipt..."))
  const verifiedWarrantyReceipt = await verifyServiceReceipt(warrantyReceiptJwt, WARRANTY_PAYMENT_OPTION_ID, c)
  if (!verifiedWarrantyReceipt) {
    throw new HTTPException(400, { message: "Invalid or incorrect Warranty receipt." })
  }
  log(successMessage("Warranty receipt verified successfully for purchase."))

  // Step 2: Prerequisites met, proceed with purchase payment
  const purchaseReceiptJwt = c.req.header("Authorization")?.replace("Bearer ", "")
  if (purchaseReceiptJwt) {
    log(colors.dim("Verifying main purchase receipt..."))
    const verifiedPurchaseReceipt = await verifyServiceReceipt(purchaseReceiptJwt, PURCHASE_PAYMENT_OPTION_ID, c)
    if (verifiedPurchaseReceipt) {
      log(successMessage("Main purchase receipt verified successfully!"))
      // In a real scenario, you'd finalize the order here (e.g., save to DB, notify fulfillment)
      return c.json({ message: "Watch purchased! Order #order_id_XYZ, Tracking #tracking_info.", orderId: "order_id_XYZ", trackingInfo: "tracking_info" })
    } else {
      throw new HTTPException(400, { message: "Invalid or incorrect main purchase receipt." })
    }
  } else {
    log(colors.yellow("Logistics & Warranty verified. No main purchase receipt found, generating payment request for watch..."))
    const paymentRequestInit = createServicePaymentRequest(
        serverIdentity.did,
        serverIdentity.crypto.address, // For Stripe, recipient is server DID, but helper handles this.
        PURCHASE_PAYMENT_OPTION_ID,
        25000, // $250 USD (2 decimals for Stripe)
        "USD",
        2,
        "stripe", // Network is Stripe
        RECEIPT_SERVICE_URL
    )
    const paymentRequest402Response = await createPaymentRequestResponse(
        paymentRequestInit,
        {
          issuer: serverIdentity.did,
          signer: serverIdentity.jwtSigner,
          algorithm: serverIdentity.keypair.algorithm,
        }
    )
    log(successMessage("Main purchase payment request generated"))
    throw new HTTPException(402, { res: paymentRequest402Response })
  }
})



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

app.post("/onchain-settlement/:purpose", async(c) => {
  try {
    const { paymentToken } = await c.req.json()
    const purpose = await c.req.param("purpose")
    let paymentOptionId = purpose === 'logistics' ? LOGISTICS_PAYMENT_OPTION_ID : WARRANTY_PAYMENT_OPTION_ID;
    let res = await performPayment(clientKeypairInfo, paymentToken, paymentOptionId);
    return c.json(res)
  } catch (err) {
    return c.json({error: "Couldn't settle transaction on chain"}, 500)

  }

})

app.post("/get-receipt", async(c) => {
  console.log(await c.req.json())
  try {
    const { paymentToken, settlementTxnHash, clientPrivateKey, paymentOptionId, smartWalletAddress } = await c.req.json()

    const clientKeypairInfo = await getKeypairInfo(clientPrivateKey)
    let res = await getReceipt(clientKeypairInfo, paymentToken, paymentOptionId, settlementTxnHash, smartWalletAddress);
    return c.json(res)

  } catch (err) {
    return c.json({error: "Could not get verifiable receipt for transaction hash and payment token"}, 500)
  }

})



async function performPayment(client: KeypairInfo, paymentRequestJwt: JwtString, selectedPaymentOptionId: string) {
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

  log(`**************** ${client.crypto.account}`)


  const walletClient = createWalletClient({
    account: client.crypto.account,
    chain: publicClient.chain,
    transport: http()
  })

//   const signature = await signTypedData(walletClient, {
//     domain,
//     types: transferAuthorisationTypes,
//     primaryType: "TransferWithAuthorization",
//     message: messageToSign
//   })
//   log(successMessage("TransferWithAuthorization message signed by client."))
//   log(colors.dim(`Signature: ${signature}`))

//   log(
//       sectionHeader(
//           "💸 Client Requests Payment Execution (Client Agent -> x402 Facilitator)"
//       )
//   )
//   log(
//       colors.dim(
//           `${colors.bold("Client Agent 👤 -> x402 Facilitator 💳")}

// The Client Agent now sends the signed 'TransferWithAuthorization' message (via the signature and authorization object), along with payment requirements, to the x402 Facilitator's /settle endpoint (${X402_FACILITATOR_URL}/settle). The Facilitator will use this authorization to execute the USDC transfer on behalf of the client and will pay the associated blockchain gas fees.`
//       )
//   )

  const signature = "0x000000000000000000000000ca11bde05977b3631167028862be2a173976ca11000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000024482ad56cb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000ba5ed0c6aa8c49038f819e587e2633c4a9f428a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001543ffba36f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000004001b4562879d1e9a5b52ac9eee9d5bd15ef74742db15aee5f4a8eb9e029260073b37a56d7d58d687cc9cba5512fdc68b6222809eb9cce725b7296e82319801cff0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000f85210b21cc50302f477ba56686d2019dc9b67ade15b0a8c44ecad456533d0110ead2ce00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000017000000000000000000000000000000000000000000000000000000000000000193c2c69c2fca82cd6bc89f6a612583832a7706688b5c90db57fcf20a58f856f279a11dd769aaa7a7e47320f2bc32fdab6fc192c1adf5146e6ca719e3069313040000000000000000000000000000000000000000000000000000000000000025f198086b2db17256731bc456673b96bcef23f51d1fbacdd7c4379ef65465572f0500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22334b67505f46517368697256587241464a61725545446b78426a334433666a46793474585445337a667167222c226f726967696e223a2268747470733a2f2f6b6579732e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d000000000000000000000000000000000000000000006492649264926492649264926492649264926492649264926492649264926492"

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

  return {facilitatorJson, "successMessage": "Successfully able to settle transaction on chain 🎉"};

}


async function getReceipt(
    client: KeypairInfo,
    paymentRequestJwt: JwtString,
    selectedPaymentOptionId: string,
    settlementTxHash: string,
    smartWalletAddress: string
) {
  const didResolver = getDidResolver()
  const { paymentRequest } = await verifyPaymentToken(paymentRequestJwt, {
    resolver: didResolver
  })
  log(
      colors.dim(
          `${colors.bold("Client Agent 👤 -> Your Receipt Service 🧾")}

With the payment settled by the x402 Facilitator, the Client Agent now requests a formal, cryptographically verifiable payment receipt from Your Receipt Service. The Client sends the original 'paymentToken', the 'paymentOptionId', and the 'settlementTxHash' (obtained from the Facilitator) to the Receipt Service. The Client also signs this request with its own DID.`
      )
  )

  log(colors.dim("✍️ Creating a signed payload (JWT) for Your Receipt Service..."))

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

  log(colors.dim(`Submitting to Your Receipt Service (${RECEIPT_SERVICE_URL})...`))
  const receiptServiceApiResponse = await fetch(RECEIPT_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: signedPayloadForReceiptService,
      smartWalletAddress: smartWalletAddress
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
  return { receipt, details, "successMessage":  "Verifiable Receipt obtained successfully from Your Receipt Service! ✅"}
}


serve({
  port: 4567,
  fetch: app.fetch
})

log(successMessage("ACK Pay Demo Server started on port 4567"))
log(colors.dim("Press Ctrl+C to stop."))
