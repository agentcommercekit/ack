import {
  createDidDocumentFromKeypair,
  createDidKeyUri,
  getDidResolver,
  type DidDocument,
  type DidUri,
} from "@agentcommercekit/did"
import {
  createJwt,
  createJwtSigner,
  curveToJwtAlgorithm,
  type JwtSigner,
} from "@agentcommercekit/jwt"
import { generateKeypair, type Keypair } from "@agentcommercekit/keys"
import { beforeEach, describe, expect, it } from "vitest"

import type { PaymentRequestInit } from "./payment-request"

import { createSignedPaymentRequest } from "./create-signed-payment-request"
import { verifyPaymentRequestToken } from "./verify-payment-request-token"

/**
 * Removes undefined values from the payment request
 */
function cleanPaymentRequest(paymentRequest: PaymentRequestInit) {
  return Object.fromEntries(
    Object.entries(paymentRequest).filter(([_, v]) => v),
  )
}

describe("verifyPaymentRequestToken", () => {
  let keypair: Keypair
  let signer: JwtSigner
  let issuerDid: DidUri
  let issuerDidDocument: DidDocument

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
    issuerDidDocument = createDidDocumentFromKeypair({
      did: issuerDid,
      keypair,
    })
  })

  it("verifies a valid payment request token", async () => {
    // Generate a valid payment request token
    const body = await createSignedPaymentRequest(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve),
    })

    const resolver = getDidResolver()
    resolver.addToCache(issuerDid, issuerDidDocument)

    // Verify the token
    const result = await verifyPaymentRequestToken(body.paymentRequestToken, {
      resolver,
    })

    expect(result.paymentRequest).toStrictEqual(
      cleanPaymentRequest(body.paymentRequest),
    )
    expect(result.parsed.issuer).toEqual(issuerDid)
  })

  it("throws for invalid JWT format", async () => {
    const resolver = getDidResolver()
    resolver.addToCache(issuerDid, issuerDidDocument)

    await expect(
      verifyPaymentRequestToken("invalid.jwt.token", {
        resolver,
      }),
    ).rejects.toThrow("Invalid payment request token")
  })

  it("throws for expired JWT", async () => {
    // Create a JWT with an expiration date in the past
    const expiredPayload = {
      ...paymentRequest,
      sub: paymentRequest.id,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
    }

    const expiredToken = await createJwt(
      expiredPayload,
      {
        issuer: issuerDid,
        signer,
      },
      {
        alg: curveToJwtAlgorithm(keypair.curve),
      },
    )

    const resolver = getDidResolver()
    resolver.addToCache(issuerDid, issuerDidDocument)

    await expect(
      verifyPaymentRequestToken(expiredToken, {
        resolver,
      }),
    ).rejects.toThrow("Invalid payment request token")
  })

  it("allows expired JWT when expiry verification is disabled", async () => {
    // Create a JWT with an expiration date in the past
    const expiredPayload = {
      ...paymentRequest,
      sub: paymentRequest.id,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
    }

    const expiredToken = await createJwt(
      expiredPayload,
      {
        issuer: issuerDid,
        signer,
      },
      {
        alg: curveToJwtAlgorithm(keypair.curve),
      },
    )

    const resolver = getDidResolver()
    resolver.addToCache(issuerDid, issuerDidDocument)

    // Verify with verifyExpiry set to false
    const result = await verifyPaymentRequestToken(expiredToken, {
      resolver,
      verifyExpiry: false,
    })

    expect(result.paymentRequest).toBeDefined()
    expect(result.parsed.issuer).toEqual(issuerDid)
  })

  it("throws for JWT with invalid signature", async () => {
    const body = await createSignedPaymentRequest(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve),
    })

    // Create a resolver with a different public key to make signature verification fail
    const differentKeypair = await generateKeypair("secp256k1")
    const resolver = getDidResolver()
    resolver.addToCache(
      issuerDid,
      createDidDocumentFromKeypair({
        did: issuerDid,
        keypair: differentKeypair,
      }),
    )

    await expect(
      verifyPaymentRequestToken(body.paymentRequestToken, {
        resolver,
      }),
    ).rejects.toThrow("Invalid payment request token")
  })

  it("throws for a JWT that does not contain a payment config", async () => {
    // Create a JWT with valid format but missing payment config
    const invalidToken = await createJwt(
      { sub: "test-payment-request-id" },
      {
        issuer: issuerDid,
        signer,
      },
    )

    const resolver = getDidResolver()
    resolver.addToCache(issuerDid, issuerDidDocument)

    await expect(
      verifyPaymentRequestToken(invalidToken, {
        resolver,
      }),
    ).rejects.toThrow("Payment Request token is not a valid PaymentRequest")
  })
})
