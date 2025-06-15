import express from "express";
import { paymentMiddleware, Network } from "x402-express";
import { ethers } from "ethers";
import { getDidResolver } from "@agentcommercekit/did";
import { createPaymentReceipt, verifyPaymentReceipt } from "@agentcommercekit/ack-pay";
import { signCredential, parseJwtCredential, verifyParsedCredential } from "@agentcommercekit/vc";
import { getControllerClaimVerifier } from "@agentcommercekit/ack-id";
import { createJwtSigner } from "@agentcommercekit/jwt";

const app = express();
app.use(express.json());

// Setup wallet and ACK components
const receiverWallet = ethers.Wallet.createRandom();
const RECEIVER_ADDRESS = receiverWallet.address;

// Receipt service setup
const receiptServiceWallet = ethers.Wallet.createRandom();
const receiptServiceDid = `did:pkh:evm:1:${receiptServiceWallet.address}`;
const receiptSigner = createJwtSigner(receiptServiceWallet.privateKey, "ES256K");

// ACK components
const didResolver = getDidResolver();
const controllerVerifier = getControllerClaimVerifier();

// Configure x402 middleware for payment handling
app.use(paymentMiddleware(
  RECEIVER_ADDRESS,
  {
    // Protected routes with pricing
    "GET /api/protected": {
      price: "$0.01",
      network: Network["base-sepolia"],
      config: {
        description: "Access to protected API endpoint",
        mimeType: "application/json",
        maxTimeoutSeconds: 300
      }
    },
    "GET /api/premium": {
      price: "$0.05", 
      network: Network["base-sepolia"],
      config: {
        description: "Premium data access",
        outputSchema: {
          type: "object",
          properties: {
            data: { type: "string" },
            tier: { type: "string" },
            timestamp: { type: "string" }
          }
        }
      }
    },
    "POST /api/action": {
      price: "$0.02",
      network: Network["base-sepolia"],
      config: {
        description: "Perform premium action"
      }
    }
  },
  {
    url: "https://x402.org/facilitator" // Base Sepolia testnet facilitator
  }
));

// Middleware to enhance x402 with ACK-ID and ACK-Pay
app.use("/api/*", async (req, res, next) => {
  // Check if payment was verified by x402 middleware
  const paymentVerified = req.headers['x-payment-verified'] === 'true';
  const authHeader = req.headers['authorization'];
  const identityHeader = req.headers['x-identity'];
  
  // Check for ACK-Pay receipt (skip if x402 already verified payment)
  if (authHeader?.startsWith('Bearer ') && !paymentVerified) {
    try {
      const jwtReceipt = authHeader.substring(7);
      const result = await verifyPaymentReceipt(jwtReceipt, {
        resolver: didResolver,
        trustedReceiptIssuers: [receiptServiceDid],
      });
      
      if (result && !isExpired(result.receipt)) {
        // Valid receipt - attach info to request
        req.authMethod = 'ack-pay-receipt';
        req.payerDid = result.receipt.credentialSubject.payerDid;
        return next();
      }
    } catch (error) {
      // Invalid receipt, continue to other auth methods
    }
  }
  
  // If payment was verified by x402, require ACK-ID
  if (paymentVerified) {
    if (!identityHeader) {
      return res.status(401).json({
        error: "Identity required",
        message: "Payment verified but ACK-ID credential missing",
        required: {
          header: "X-IDENTITY",
          type: "ControllerCredential",
          description: "Include your ACK-ID controller credential"
        }
      });
    }
    
    try {
      // Verify ACK-ID
      const identityCredential = await parseJwtCredential(identityHeader, didResolver);
      await verifyParsedCredential(identityCredential, {
        resolver: didResolver,
        verifiers: [controllerVerifier]
      });
      
      const payerDid = identityCredential.credentialSubject.id;
      const paymentAmount = req.headers['x-payment-amount'] || '0';
      
      // Create ACK-Pay receipt
      const receipt = createPaymentReceipt({
        paymentToken: req.headers['x-payment'] || 'x402-verified',
        paymentOptionId: "x402-base-sepolia",
        issuer: receiptServiceDid,
        payerDid: payerDid,
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          amount: paymentAmount,
          network: "base-sepolia",
          endpoint: req.path,
          verifiedAt: new Date().toISOString()
        }
      });
      
      const signedReceipt = await signCredential(receipt, {
        signer: receiptSigner,
        algorithm: "ES256K"
      });
      
      // Attach to request for route handlers
      req.authMethod = 'x402+ack-id';
      req.payerDid = payerDid;
      req.receipt = signedReceipt;
      req.receiptExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
    } catch (error) {
      return res.status(401).json({
        error: "Identity verification failed",
        details: error instanceof Error ? error.message : "Invalid ACK-ID credential"
      });
    }
  }
  
  next();
});

// Protected endpoint - accessed after payment/identity verification
app.get("/api/protected", (req, res) => {
  const response: any = {
    success: true,
    data: "Protected content accessed successfully",
    method: req.authMethod || "unknown",
    timestamp: new Date().toISOString()
  };
  
  if (req.payerDid) {
    response.payerDid = req.payerDid;
  }
  
  if (req.receipt) {
    response.receipt = req.receipt;
    response.receiptExpiry = req.receiptExpiry;
  }
  
  res.json(response);
});

// Premium endpoint
app.get("/api/premium", (req, res) => {
  res.json({
    data: "Premium tier data",
    tier: "premium",
    timestamp: new Date().toISOString(),
    method: req.authMethod || "x402",
    payerDid: req.payerDid
  });
});

// Action endpoint
app.post("/api/action", (req, res) => {
  res.json({
    success: true,
    action: "completed",
    input: req.body,
    method: req.authMethod || "x402",
    payerDid: req.payerDid
  });
});

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "x402-express + ACK Integration Server",
    receiver: RECEIVER_ADDRESS,
    receiptIssuer: receiptServiceDid,
    endpoints: {
      protected: {
        path: "/api/protected",
        price: "$0.01",
        requirements: "x402 payment + ACK-ID identity"
      },
      premium: {
        path: "/api/premium",
        price: "$0.05"
      },
      action: {
        path: "/api/action",
        price: "$0.02",
        method: "POST"
      }
    },
    features: [
      "x402-express handles payment verification",
      "ACK-ID provides identity verification",
      "ACK-Pay issues receipts for 24-hour access"
    ]
  });
});

// Helper function
function isExpired(credential: any): boolean {
  if (!credential.expirationDate) return false;
  return new Date(credential.expirationDate) < new Date();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authMethod?: string;
      payerDid?: string;
      receipt?: string;
      receiptExpiry?: string;
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 x402-express + ACK Integration Server
🌐 Listening at http://localhost:${PORT}
💰 Receiver: ${RECEIVER_ADDRESS}
🆔 Receipt Issuer: ${receiptServiceDid}
📦 Using: x402-express for payment handling
🔐 Flow: x402 payment → ACK-ID verification → ACK-Pay receipt
  `);
});

export default app;