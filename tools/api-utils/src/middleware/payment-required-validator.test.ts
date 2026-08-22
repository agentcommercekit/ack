import { DidResolver } from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import * as ackPay from "@agentcommercekit/ack-pay"
import { Hono } from "hono"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  paymentRequiredValidator,
  type PaymentRequiredEnv,
} from "./payment-required-validator"

describe("paymentRequiredValidator", () => {
  const mockPaymentRequestInit: ackPay.PaymentRequestInit = {
    id: "test_req_001",
    description: "API access fee",
    paymentOptions: [
      {
        id: "usdc-opt-1",
        amount: 50000,
        decimals: 6,
        currency: "USDC",
        recipient: "0x1234567890abcdef1234567890abcdef12345678",
      },
    ],
  }

  let serverKeypair: any
  let serverSigner: any
  let resolver: DidResolver

  beforeEach(async () => {
    serverKeypair = await generateKeypair("secp256k1")
    serverSigner = createJwtSigner(serverKeypair)
    resolver = new DidResolver()
  })

  it("returns HTTP 402 with signed payment request when no receipt is present", async () => {
    const app = new Hono<PaymentRequiredEnv>()
    app.use("*", async (c, next) => {
      c.set("resolver", resolver)
      await next()
    })

    app.get(
      "/protected",
      paymentRequiredValidator({
        paymentRequest: mockPaymentRequestInit,
        signerOptions: {
          issuer: "did:web:server.catena.com",
          signer: serverSigner,
        },
      }),
      (c) => c.json({ access: "granted" }),
    )

    const res = await app.request("/protected")
    expect(res.status).toBe(402)

    const data = await res.json()
    expect(data.paymentRequest).toBeDefined()
    expect(data.paymentRequest.id).toBe("test_req_001")
    expect(data.paymentRequestToken).toBeDefined()
    expect(typeof data.paymentRequestToken).toBe("string")
  })

  it("verifies valid receipt in Authorization header and allows access", async () => {
    const mockVerifiedPayment = {
      receipt: { id: "receipt_vc_001" },
      paymentRequestToken: "mock.jwt.token",
      paymentRequest: mockPaymentRequestInit as any,
    }

    vi.spyOn(ackPay, "verifyPaymentReceipt").mockResolvedValue(
      mockVerifiedPayment as any,
    )

    const app = new Hono<PaymentRequiredEnv>()
    app.use("*", async (c, next) => {
      c.set("resolver", resolver)
      await next()
    })

    app.get(
      "/protected",
      paymentRequiredValidator({
        paymentRequest: mockPaymentRequestInit,
        signerOptions: {
          issuer: "did:web:server.catena.com",
          signer: serverSigner,
        },
        trustedReceiptIssuers: ["did:web:receipt.catena.com"],
      }),
      (c) => {
        const payment = c.get("ackPayment")
        return c.json({ access: "granted", payment })
      },
    )

    const res = await app.request("/protected", {
      headers: {
        Authorization: "Bearer mock.valid.jwt.receipt",
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.access).toBe("granted")
    expect(data.payment).toEqual(mockVerifiedPayment)
  })

  it("accepts payment receipt from X-ACK-Payment-Proof header", async () => {
    const mockVerifiedPayment = {
      receipt: { id: "receipt_vc_002" },
      paymentRequestToken: "mock.jwt.token",
      paymentRequest: mockPaymentRequestInit as any,
    }

    vi.spyOn(ackPay, "verifyPaymentReceipt").mockResolvedValue(
      mockVerifiedPayment as any,
    )

    const app = new Hono<PaymentRequiredEnv>()
    app.use("*", async (c, next) => {
      c.set("resolver", resolver)
      await next()
    })

    app.get(
      "/protected",
      paymentRequiredValidator({
        paymentRequest: mockPaymentRequestInit,
        signerOptions: {
          issuer: "did:web:server.catena.com",
          signer: serverSigner,
        },
      }),
      (c) => c.json({ access: "granted", payment: c.get("ackPayment") }),
    )

    const res = await app.request("/protected", {
      headers: {
        "X-ACK-Payment-Proof": "mock.proof.header.receipt",
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.access).toBe("granted")
  })

  it("returns HTTP 400 when invalid receipt is provided", async () => {
    vi.spyOn(ackPay, "verifyPaymentReceipt").mockRejectedValue(
      new Error("Invalid cryptographic receipt signature"),
    )

    const app = new Hono<PaymentRequiredEnv>()
    app.use("*", async (c, next) => {
      c.set("resolver", resolver)
      await next()
    })

    app.get(
      "/protected",
      paymentRequiredValidator({
        paymentRequest: mockPaymentRequestInit,
        signerOptions: {
          issuer: "did:web:server.catena.com",
          signer: serverSigner,
        },
      }),
      (c) => c.json({ access: "granted" }),
    )

    const res = await app.request("/protected", {
      headers: {
        Authorization: "Bearer invalid.receipt.token",
      },
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toBe("Invalid receipt")
  })
})
