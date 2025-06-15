import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { ethers } from "ethers";
import { createControllerCredential } from "@agentcommercekit/ack-id";
import { signCredential } from "@agentcommercekit/vc";
import { createJwtSigner } from "@agentcommercekit/jwt";
import app from "./server";

// Mock x402-express to control payment verification
vi.mock("x402-express", () => ({
  paymentMiddleware: (receiver: string, routes: any, config: any) => {
    return (req: any, res: any, next: any) => {
      const routeKey = `${req.method} ${req.path}`;
      const routeConfig = routes[routeKey];
      
      if (!routeConfig) {
        return next();
      }
      
      const xPayment = req.headers['x-payment'];
      
      if (!xPayment) {
        // Return 402 with payment requirements
        return res.status(402).json({
          error: "Payment Required",
          price: routeConfig.price,
          receiver: receiver,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          network: routeConfig.network,
          description: routeConfig.config?.description || "Payment required"
        });
      }
      
      // Simulate successful payment verification
      req.headers['x-payment-verified'] = 'true';
      req.headers['x-payment-amount'] = routeConfig.price.replace('$', '').replace('.', '');
      next();
    };
  },
  Network: {
    "base-sepolia": "base-sepolia"
  }
}));

describe("x402-express + ACK Integration", () => {
  let server: any;
  let mockIdentity: string;
  let mockReceipt: string;
  
  beforeAll(async () => {
    // Start server
    server = app.listen(0); // Random port
    
    // Create mock ACK-ID identity
    const controllerWallet = ethers.Wallet.createRandom();
    const controllerDid = `did:pkh:evm:1:${controllerWallet.address}`;
    const controllerSigner = createJwtSigner(controllerWallet.privateKey, "ES256K");
    
    const credential = createControllerCredential({
      subject: `did:key:z6Mk${ethers.utils.hexlify(ethers.utils.randomBytes(32)).substring(2)}`,
      controller: controllerDid,
      issuer: controllerDid
    });
    
    mockIdentity = await signCredential(credential, {
      signer: controllerSigner,
      algorithm: "ES256K"
    });
  });
  
  afterAll(() => {
    server.close();
  });

  describe("Payment Flow", () => {
    it("returns 402 without payment", async () => {
      const response = await request(app)
        .get("/api/protected")
        .expect(402);
      
      expect(response.body.error).toBe("Payment Required");
      expect(response.body.price).toBe("$0.01");
      expect(response.body.receiver).toBeDefined();
      expect(response.body.network).toBe("base-sepolia");
    });

    it("requires identity after payment", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("X-PAYMENT", "mock-payment-token")
        .expect(401);
      
      expect(response.body.error).toBe("Identity required");
      expect(response.body.message).toContain("ACK-ID credential missing");
    });

    it("accepts payment + identity and returns receipt", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("X-PAYMENT", "mock-payment-token")
        .set("X-IDENTITY", mockIdentity)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.method).toBe("x402+ack-id");
      expect(response.body.receipt).toBeDefined();
      expect(response.body.receiptExpiry).toBeDefined();
      expect(response.body.payerDid).toBeDefined();
      
      // Save receipt for next test
      mockReceipt = response.body.receipt;
    });

    it("accepts valid ACK-Pay receipt", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${mockReceipt}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.method).toBe("ack-pay-receipt");
      expect(response.body.payerDid).toBeDefined();
    });
  });

  describe("Different Endpoints", () => {
    it("handles different pricing for premium endpoint", async () => {
      const response = await request(app)
        .get("/api/premium")
        .expect(402);
      
      expect(response.body.price).toBe("$0.05");
      expect(response.body.description).toContain("Premium");
    });

    it("handles POST endpoints", async () => {
      const response = await request(app)
        .post("/api/action")
        .send({ action: "test" })
        .expect(402);
      
      expect(response.body.price).toBe("$0.02");
    });

    it("processes POST with payment", async () => {
      const response = await request(app)
        .post("/api/action")
        .set("X-PAYMENT", "mock-payment")
        .set("X-IDENTITY", mockIdentity)
        .send({ action: "test" })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe("completed");
      expect(response.body.input.action).toBe("test");
    });
  });

  describe("Integration Flow", () => {
    it("demonstrates complete payment lifecycle", async () => {
      // 1. Initial request - 402
      const res1 = await request(app).get("/api/protected");
      expect(res1.status).toBe(402);
      
      // 2. Payment only - 401
      const res2 = await request(app)
        .get("/api/protected")
        .set("X-PAYMENT", "payment-token");
      expect(res2.status).toBe(401);
      
      // 3. Payment + Identity - 200 with receipt
      const res3 = await request(app)
        .get("/api/protected")
        .set("X-PAYMENT", "payment-token")
        .set("X-IDENTITY", mockIdentity);
      expect(res3.status).toBe(200);
      expect(res3.body.receipt).toBeDefined();
      
      // 4. Receipt reuse - 200
      const res4 = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${res3.body.receipt}`);
      expect(res4.status).toBe(200);
      expect(res4.body.method).toBe("ack-pay-receipt");
    });
  });

  describe("Error Handling", () => {
    it("handles invalid identity gracefully", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("X-PAYMENT", "payment-token")
        .set("X-IDENTITY", "invalid-jwt")
        .expect(401);
      
      expect(response.body.error).toBe("Identity verification failed");
    });

    it("handles expired receipts", async () => {
      // Create an expired receipt (would need to mock time)
      const expiredReceipt = "eyJ...expired";
      
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${expiredReceipt}`)
        .expect(402);
      
      expect(response.body.error).toBe("Payment Required");
    });
  });
});

describe("Home Route", () => {
  it("provides API information", async () => {
    const response = await request(app)
      .get("/")
      .expect(200);
    
    expect(response.body.message).toContain("x402-express");
    expect(response.body.receiver).toBeDefined();
    expect(response.body.receiptIssuer).toBeDefined();
    expect(response.body.endpoints).toBeDefined();
    expect(response.body.features).toBeInstanceOf(Array);
  });
});