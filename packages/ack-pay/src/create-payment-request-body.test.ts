import {
  createDidDocumentFromKeypair,
  createDidKeyUri,
  getDidResolver
} from "@agentcommercekit/did"
import {
  createJwtSigner,
  curveToJwtAlgorithm,
  isJwtString
} from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { beforeEach, describe, expect, it } from "vitest"
import { createPaymentRequestBody } from "./create-payment-request-body"
import { verifyPaymentToken } from "./verify-payment-token"
import type { PaymentRequestInit } from "./payment-request"
import type { DidUri } from "@agentcommercekit/did"
import type { JwtSigner } from "@agentcommercekit/jwt"
import type { Keypair } from "@agentcommercekit/keys"

describe("createPaymentRequestBody()", () => {
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
        recipient: "sol:123"
      }
    ]
  }

  beforeEach(async () => {
    keypair = await generateKeypair("secp256k1")
    signer = createJwtSigner(keypair)
    issuerDid = createDidKeyUri(keypair)
  })

  it("generates a valid 402 response", async () => {
    const result = await createPaymentRequestBody(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve)
    })

    expect(result.paymentRequest).toEqual({
      id: "test-payment-request-id",
      paymentOptions: [
        {
          id: "test-payment-option-id",
          amount: 10,
          decimals: 2,
          currency: "USD",
          recipient: "sol:123"
        }
      ]
    })

    expect(isJwtString(result.paymentToken)).toBe(true)
  })

  it("generates a valid jwt payment token", async () => {
    const body = await createPaymentRequestBody(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve)
    })

    const resolver = getDidResolver()
    resolver.addToCache(
      issuerDid,
      createDidDocumentFromKeypair({
        did: issuerDid,
        keypair
      })
    )

    const result = await verifyPaymentToken(body.paymentToken, {
      resolver
    })

    expect(result.parsed.payload.iss).toBe(issuerDid)
    expect(result.parsed.payload.sub).toBe(paymentRequest.id)

    Object.entries(body.paymentRequest).forEach(([key, value]) => {
      expect(result.parsed.payload[key]).toEqual(value)
    })
  })

  it("includes expiresAt in ISO string format when provided", async () => {
    const expiresAt = new Date("2024-12-31T23:59:59Z")
    const result = await createPaymentRequestBody(
      { ...paymentRequest, expiresAt },
      {
        issuer: issuerDid,
        signer,
        algorithm: curveToJwtAlgorithm(keypair.curve)
      }
    )

    expect(result.paymentRequest.expiresAt).toBe("2024-12-31T23:59:59.000Z")
  })
})
