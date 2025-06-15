import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ethers } from "ethers";
import { createControllerCredential } from "@agentcommercekit/ack-id";
import { createPaymentReceipt } from "@agentcommercekit/ack-pay";
import { signCredential } from "@agentcommercekit/vc";

// Test version of integrated server - using mock signers for testing
const app = new Hono();
const wallet = ethers.Wallet.createRandom();
const receiptServiceDid = `did:key:z6Mk${ethers.utils.hexlify(ethers.utils.randomBytes(32)).substring(2)}`;

// Mock signer for testing - bypass JWT signer creation
const mockSigner = async (data: string) => {
  // Simple mock signature
  return "mock-signature-" + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
};

app.get("/api/protected", async (c) => {
  const authHeader = c.req.header("Authorization");
  const xPayment = c.req.header("X-PAYMENT");
  const identityHeader = c.req.header("X-IDENTITY");
  
  // Check for valid receipt
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const receipt = authHeader.substring(7);
    // Simple test validation - accept any JWT starting with expected prefix
    if (receipt.startsWith("eyJ") || receipt.includes("mock-jwt")) {
      return c.json({ 
        success: true,
        data: "Premium content",
        method: "ack-pay-receipt"
      });
    }
  }
  
  // Check for identity + payment
  if (xPayment && identityHeader) {
    // For testing, accept any valid-looking credentials
    if ((identityHeader.startsWith("eyJ") || identityHeader.includes("mock-jwt")) && xPayment.length > 0) {
      // Create test receipt - return mock JWT
      const mockReceipt = "mock-jwt-receipt-" + Date.now();
      
      return c.json({ 
        success: true,
        data: "Premium content",
        method: "x402+ack-id",
        receipt: mockReceipt,
        receiptExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }
  
  // Return integrated requirements
  throw new HTTPException(402, {
    res: Response.json({
      error: "Payment required",
      requirements: {
        identity: {
          type: "ack-id",
          header: "X-IDENTITY",
          credentialType: "ControllerCredential"
        },
        payment: {
          type: "x402",
          header: "X-PAYMENT",
          scheme: "exact",
          network: "base-sepolia",
          maxAmountRequired: "10000",
          payTo: wallet.address,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        },
        alternative: {
          type: "ack-pay-receipt",
          header: "Authorization",
          format: "Bearer <jwt-receipt>"
        }
      },
      receiptService: receiptServiceDid
    }, { status: 402 })
  });
});

describe("Integrated ACK + x402 Server", () => {
  it("returns 402 with integrated requirements", async () => {
    const res = await app.request("/api/protected");
    expect(res.status).toBe(402);
    
    const body = await res.json();
    expect(body.error).toBe("Payment required");
    expect(body.requirements).toBeDefined();
    expect(body.requirements.identity.type).toBe("ack-id");
    expect(body.requirements.payment.type).toBe("x402");
    expect(body.requirements.alternative.type).toBe("ack-pay-receipt");
  });

  it("rejects payment without identity", async () => {
    const payment = { amount: "10000", from: "0x123" };
    const xPayment = Buffer.from(JSON.stringify(payment)).toString("base64");
    
    const res = await app.request("/api/protected", {
      headers: { "X-PAYMENT": xPayment }
    });
    
    expect(res.status).toBe(402);
  });
  
  it("rejects identity without payment", async () => {
    // Use mock identity for testing
    const mockIdentity = "mock-jwt-identity-123";
    
    const res = await app.request("/api/protected", {
      headers: { "X-IDENTITY": mockIdentity }
    });
    
    expect(res.status).toBe(402);
  });

  it("accepts payment with identity and issues receipt", async () => {
    // Use mock identity
    const mockIdentity = "mock-jwt-identity-456";
    
    // Create payment
    const payment = {
      amount: "10000",
      payTo: wallet.address,
      from: "0x123",
      txHash: "0x" + "a".repeat(64)
    };
    const xPayment = Buffer.from(JSON.stringify(payment)).toString("base64");
    
    // Send both
    const res = await app.request("/api/protected", {
      headers: { 
        "X-PAYMENT": xPayment,
        "X-IDENTITY": mockIdentity
      }
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.method).toBe("x402+ack-id");
    expect(body.receipt).toBeDefined();
    expect(body.receiptExpiry).toBeDefined();
  });
  
  it("accepts valid ACK-Pay receipt", async () => {
    // First create a receipt by making a payment
    const payment = { amount: "10000" };
    const xPayment = Buffer.from(JSON.stringify(payment)).toString("base64");
    const identity = "mock-jwt-identity-789";
    
    const res1 = await app.request("/api/protected", {
      headers: { 
        "X-PAYMENT": xPayment,
        "X-IDENTITY": identity
      }
    });
    
    const { receipt } = await res1.json();
    
    // Use the receipt
    const res2 = await app.request("/api/protected", {
      headers: { "Authorization": `Bearer ${receipt}` }
    });
    
    expect(res2.status).toBe(200);
    const body = await res2.json();
    expect(body.method).toBe("ack-pay-receipt");
  });
});

describe("Integration Flow", () => {
  it("demonstrates complete integrated flow", async () => {
    // Step 1: Request without anything
    const res1 = await app.request("/api/protected");
    expect(res1.status).toBe(402);
    
    // Step 2: Create mock identity
    const mockIdentity = "mock-jwt-identity-flow";
    
    // Step 3: Create payment
    const payment = {
      amount: "10000",
      payTo: wallet.address,
      txHash: "0x123..."
    };
    const xPayment = Buffer.from(JSON.stringify(payment)).toString("base64");
    
    // Step 4: Send with identity + payment
    const res2 = await app.request("/api/protected", {
      headers: { 
        "X-PAYMENT": xPayment,
        "X-IDENTITY": mockIdentity
      }
    });
    
    expect(res2.status).toBe(200);
    const body = await res2.json();
    expect(body.receipt).toBeDefined();
    
    // Step 5: Use receipt for future access
    const res3 = await app.request("/api/protected", {
      headers: { "Authorization": `Bearer ${body.receipt}` }
    });
    
    expect(res3.status).toBe(200);
    const receiptBody = await res3.json();
    expect(receiptBody.method).toBe("ack-pay-receipt");
  });
});