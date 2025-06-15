import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ethers } from "ethers";
import { getDidResolver } from "@agentcommercekit/did";
import { createPaymentReceipt, verifyPaymentReceipt } from "@agentcommercekit/ack-pay";
import { signCredential, parseJwtCredential, verifyParsedCredential } from "@agentcommercekit/vc";
import { getControllerClaimVerifier } from "@agentcommercekit/ack-id";
import { createJwtSigner } from "@agentcommercekit/jwt";

// True integration: ACK-ID for identity, x402 for payment, ACK-Pay for receipts
const app = new Hono();
const wallet = ethers.Wallet.createRandom();
const FACILITATOR = "https://x402.org/facilitator";

// Setup ACK components
const didResolver = getDidResolver();
const controllerVerifier = getControllerClaimVerifier();

// For demo purposes, we'll use a simple key representation
// In production, use proper key generation from @agentcommercekit/keys
const receiptServiceWallet = ethers.Wallet.createRandom();
const receiptServiceDid = `did:pkh:evm:1:${receiptServiceWallet.address}`;
const receiptSigner = createJwtSigner(receiptServiceWallet.privateKey, "ES256K");

// Store issued receipts (in production, use a database)
const issuedReceipts = new Map<string, { amount: string; expiry: number }>();

app.get("/api/protected", async (c) => {
  const authHeader = c.req.header("Authorization");
  const xPayment = c.req.header("X-PAYMENT");
  const identityHeader = c.req.header("X-IDENTITY"); // ACK-ID credential
  
  // Check if we have a valid ACK-Pay receipt from a previous payment
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const jwtReceipt = authHeader.substring(7);
      
      // Verify the receipt we issued
      const result = await verifyPaymentReceipt(jwtReceipt, {
        resolver: didResolver,
        trustedReceiptIssuers: [receiptServiceDid], // Only trust our receipts
      });
      
      if (result && !isExpired(result.receipt)) {
        return c.json({ 
          success: true,
          data: "Premium content (via stored receipt)",
          method: "ack-pay-receipt"
        });
      }
    } catch (error) {
      console.error("Receipt verification failed:", error);
    }
  }
  
  // New payment flow: Require both identity and payment
  if (xPayment && identityHeader) {
    try {
      // Step 1: Verify ACK-ID identity credential
      const identityCredential = await parseJwtCredential(identityHeader, didResolver);
      
      // Verify it's a valid controller credential
      await verifyParsedCredential(identityCredential, {
        resolver: didResolver,
        verifiers: [controllerVerifier]
      });
      
      const payerDid = identityCredential.credentialSubject.id;
      console.log("Identity verified:", payerDid);
      
      // Step 2: Verify x402 payment
      const paymentData = JSON.parse(Buffer.from(xPayment, "base64").toString());
      
      const verifyResponse = await fetch(`${FACILITATOR}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment: xPayment,
          requirements: {
            scheme: "exact",
            network: "base-sepolia",
            maxAmountRequired: "10000",
            payTo: wallet.address,
            asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
          }
        })
      });
      
      if (!verifyResponse.ok) {
        throw new Error("Payment verification failed");
      }
      
      // Step 3: Issue ACK-Pay receipt for future access
      const receipt = createPaymentReceipt({
        paymentToken: xPayment, // Store x402 payment proof
        paymentOptionId: "x402-verified",
        issuer: receiptServiceDid,
        payerDid: payerDid, // Link receipt to verified identity
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: {
          amount: paymentData.amount,
          network: "base-sepolia",
          verifiedAt: new Date().toISOString()
        }
      });
      
      // Sign the receipt
      const signedReceipt = await signCredential(receipt, {
        signer: receiptSigner,
        algorithm: "ES256K"
      });
      
      // Store receipt info
      issuedReceipts.set(payerDid, {
        amount: paymentData.amount,
        expiry: Date.now() + 24 * 60 * 60 * 1000
      });
      
      // Return content with receipt for future access
      return c.json({ 
        success: true,
        data: "Premium content (via new payment)",
        method: "x402+ack-id",
        receipt: signedReceipt, // Client can use this for 24 hours
        receiptExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
    } catch (error) {
      console.error("Integrated payment verification failed:", error);
      throw new HTTPException(402, {
        res: Response.json({
          error: "Payment and identity verification failed",
          details: error.message
        }, { status: 402 })
      });
    }
  }
  
  // No valid payment or receipt - return integrated requirements
  throw new HTTPException(402, {
    res: Response.json({
      error: "Payment required",
      requirements: {
        identity: {
          type: "ack-id",
          header: "X-IDENTITY",
          credentialType: "ControllerCredential",
          description: "Provide your ACK-ID controller credential"
        },
        payment: {
          type: "x402",
          header: "X-PAYMENT",
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: "10000",
          payTo: wallet.address,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          description: "Pay 0.01 USDC with identity verification"
        },
        alternative: {
          type: "ack-pay-receipt",
          header: "Authorization",
          format: "Bearer <jwt-receipt>",
          description: "Or use a previously issued payment receipt"
        }
      },
      receiptService: receiptServiceDid
    }, { status: 402 })
  });
});

// Helper function
function isExpired(credential: any): boolean {
  if (!credential.expirationDate) return false;
  return new Date(credential.expirationDate) < new Date();
}

app.get("/", (c) => c.json({ 
  message: "Integrated ACK + x402 Server",
  payTo: wallet.address,
  price: "0.01 USDC",
  receiptIssuer: receiptServiceDid,
  features: [
    "ACK-ID identity verification required",
    "x402 payment processing", 
    "ACK-Pay receipts for 24-hour access"
  ]
}));

console.log(`
🚀 Integrated server running at http://localhost:3000
💰 Pay to: ${wallet.address}
🆔 Receipt issuer: ${receiptServiceDid}
🔐 Features: ACK-ID + x402 + ACK-Pay integration
`);

serve({ port: 3000, fetch: app.fetch });