import {
  createDidDocumentFromKeypair,
  createDidKeyUri,
  getDidResolver,
  type DidUri,
} from "@agentcommercekit/did"
import {
  createJwtSigner,
  curveToJwtAlgorithm,
  isJwtString,
  type JwtSigner,
} from "@agentcommercekit/jwt"
import { generateKeypair, type Keypair } from "@agentcommercekit/keys"
import { beforeEach, describe, expect, it } from "vitest"
import { createSignedPaymentRequest } from "./create-signed-payment-request"
import type { PaymentRequestInit } from "./payment-request"
import { verifyPaymentRequestToken } from "./verify-payment-request-token"

describe("createSignedPaymentRequest()", () => {
  let keypair: Keypair
  let signer: JwtSigner
  let issuerDid: DidUri

  const paymentRequest: PaymentRequestInit = {
    id: "test-payment-request-id",
    paymentOptions: [
      {
        id: "test-payment-option-id",
        amount: 10,
        decimals: 2,
        currency: "USD",
        recipient: "sol:123",
      },
    ],
  }

  beforeEach(async () => {
    keypair = await generateKeypair("secp256k1")
    signer = createJwtSigner(keypair)
    issuerDid = createDidKeyUri(keypair)
  })

  it("generates a valid 402 response", async () => {
    const result = await createSignedPaymentRequest(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve),
    })

    expect(result.paymentRequest).toEqual({
      id: "test-payment-request-id",
      paymentOptions: [
        {
          id: "test-payment-option-id",
          amount: 10,
          decimals: 2,
          currency: "USD",
          recipient: "sol:123",
        },
      ],
    })

    expect(isJwtString(result.paymentRequestToken)).toBe(true)
  })

  it("generates a valid jwt payment request token", async () => {
    const body = await createSignedPaymentRequest(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve),
    })

    const resolver = getDidResolver()
    resolver.addToCache(
      issuerDid,
      createDidDocumentFromKeypair({
        did: issuerDid,
        keypair,
      }),
    )

    const result = await verifyPaymentRequestToken(body.paymentRequestToken, {
      resolver,
    })

    expect(result.parsed.payload.iss).toBe(issuerDid)
    expect(result.parsed.payload.sub).toBe(paymentRequest.id)

    Object.entries(body.paymentRequest).forEach(([key, value]) => {
      expect(result.parsed.payload[key]).toEqual(value)
    })
  })

  it("includes expiresAt in ISO string format when provided", async () => {
    const expiresAt = new Date("2024-12-31T23:59:59Z")
    const result = await createSignedPaymentRequest(
      { ...paymentRequest, expiresAt },
      {
        issuer: issuerDid,
        signer,
        algorithm: curveToJwtAlgorithm(keypair.curve),
      },
    )

    expect(result.paymentRequest.expiresAt).toBe("2024-12-31T23:59:59.000Z")
  })
})
