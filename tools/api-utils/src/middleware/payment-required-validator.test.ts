import { createPaymentReceipt } from "@agentcommercekit/ack-pay"
import {
  createDidKeyUri,
  createDidPkhUri,
  getDidResolver,
  type DidUri,
} from "@agentcommercekit/did"
import {
  createJwtSigner,
  curveToJwtAlgorithm,
  type JwtString,
} from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { signCredential } from "@agentcommercekit/vc"
import { Hono } from "hono"
import { beforeEach, describe, expect, it } from "vitest"

import { errorHandler } from "./error-handler"
import {
  paymentRequiredValidator,
  type PaymentRequiredEnv,
} from "./payment-required-validator"

describe("paymentRequiredValidator", () => {
  let app: Hono<PaymentRequiredEnv>
  let paymentRequestIssuerDid: DidUri
  let paymentRequestIssuerKeypair: Awaited<ReturnType<typeof generateKeypair>>
  let receiptIssuerKeypair: Awaited<ReturnType<typeof generateKeypair>>
  let receiptIssuerDid: DidUri
  let signedReceiptJwt: JwtString

  beforeEach(async () => {
    paymentRequestIssuerKeypair = await generateKeypair("secp256k1")
    paymentRequestIssuerDid = createDidKeyUri(paymentRequestIssuerKeypair)
    receiptIssuerKeypair = await generateKeypair("secp256k1")
    receiptIssuerDid = createDidKeyUri(receiptIssuerKeypair)

    const resolver = getDidResolver()

    app = new Hono<PaymentRequiredEnv>()
    app.onError(errorHandler)
    app.get(
      "/resource",
      paymentRequiredValidator({
        resolver,
        issuer: paymentRequestIssuerDid,
        signer: createJwtSigner(paymentRequestIssuerKeypair),
        algorithm: curveToJwtAlgorithm(paymentRequestIssuerKeypair.curve),
        trustedReceiptIssuers: [receiptIssuerDid],
        paymentRequest: {
          id: crypto.randomUUID(),
          paymentOptions: [
            {
              id: "test-option",
              amount: 100,
              decimals: 2,
              currency: "USD",
              recipient: paymentRequestIssuerDid,
            },
          ],
        },
      }),
      (c) => c.json({ ok: true }),
    )

    const paymentRequestToken = (
      await import("@agentcommercekit/ack-pay")
    ).createSignedPaymentRequest(
      {
        id: "test-request-id",
        paymentOptions: [
          {
            id: "test-option",
            amount: 100,
            decimals: 2,
            currency: "USD",
            recipient: paymentRequestIssuerDid,
          },
        ],
      },
      {
        issuer: paymentRequestIssuerDid,
        signer: createJwtSigner(paymentRequestIssuerKeypair),
        algorithm: curveToJwtAlgorithm(paymentRequestIssuerKeypair.curve),
      },
    )

    const { paymentRequestToken: token } = await paymentRequestToken

    const unsignedReceipt = createPaymentReceipt({
      paymentRequestToken: token,
      paymentOptionId: "test-option",
      issuer: receiptIssuerDid,
      payerDid: createDidPkhUri(
        "eip155:84532",
        "0x7B3D8F2E1C9A4B5D6E7F8A9B0C1D2E3F4A5B6C",
      ),
    })

    signedReceiptJwt = await signCredential(unsignedReceipt, {
      did: receiptIssuerDid,
      signer: createJwtSigner(receiptIssuerKeypair),
    })
  })

  it("returns 402 with a signed payment challenge when no receipt is supplied", async () => {
    const response = await app.request("/resource")

    expect(response.status).toBe(402)

    const body = await response.json()
    expect(body.paymentRequestToken).toBeTypeOf("string")
    expect(body.paymentRequest.paymentOptions).toHaveLength(1)
  })

  it("allows access when a valid receipt is supplied via Authorization", async () => {
    const response = await app.request("/resource", {
      headers: {
        Authorization: `Bearer ${signedReceiptJwt}`,
      },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })

  it("allows access when a valid receipt is supplied via X-ACK-Payment-Proof", async () => {
    const response = await app.request("/resource", {
      headers: {
        "X-ACK-Payment-Proof": signedReceiptJwt,
      },
    })

    expect(response.status).toBe(200)
  })

  it("returns 400 for a malformed receipt", async () => {
    const response = await app.request("/resource", {
      headers: {
        Authorization: "Bearer not-a-valid-jwt",
      },
    })

    expect(response.status).toBe(400)
  })

  it("returns 403 for a receipt from an untrusted issuer", async () => {
    const untrustedKeypair = await generateKeypair("secp256k1")
    const untrustedDid = createDidKeyUri(untrustedKeypair)

    const { createSignedPaymentRequest } = await import(
      "@agentcommercekit/ack-pay"
    )
    const { paymentRequestToken } = await createSignedPaymentRequest(
      {
        id: "other-request",
        paymentOptions: [
          {
            id: "test-option",
            amount: 100,
            decimals: 2,
            currency: "USD",
            recipient: paymentRequestIssuerDid,
          },
        ],
      },
      {
        issuer: paymentRequestIssuerDid,
        signer: createJwtSigner(paymentRequestIssuerKeypair),
        algorithm: curveToJwtAlgorithm(paymentRequestIssuerKeypair.curve),
      },
    )

    const forgedReceipt = await signCredential(
      createPaymentReceipt({
        paymentRequestToken,
        paymentOptionId: "test-option",
        issuer: untrustedDid,
        payerDid: createDidPkhUri(
          "eip155:84532",
          "0x7B3D8F2E1C9A4B5D6E7F8A9B0C1D2E3F4A5B6C",
        ),
      }),
      {
        did: untrustedDid,
        signer: createJwtSigner(untrustedKeypair),
      },
    )

    const response = await app.request("/resource", {
      headers: {
        Authorization: `Bearer ${forgedReceipt}`,
      },
    })

    expect(response.status).toBe(403)
  })
})
