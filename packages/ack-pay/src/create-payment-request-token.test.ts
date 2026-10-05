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
  verifyJwt,
  type JwtSigner,
} from "@agentcommercekit/jwt"
import { generateKeypair, type Keypair } from "@agentcommercekit/keys"
import * as v from "valibot"
import { beforeEach, describe, expect, it } from "vitest"

import { createPaymentRequestToken } from "./create-payment-request-token"
import type { PaymentRequestInit } from "./payment-request"
import { paymentRequestSchema } from "./schemas/valibot"

describe("createPaymentRequestToken()", () => {
  let keypair: Keypair
  let signer: JwtSigner
  let issuerDid: DidUri

  const paymentRequestInit: PaymentRequestInit = {
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
  const paymentRequest = v.parse(paymentRequestSchema, paymentRequestInit)

  beforeEach(async () => {
    keypair = await generateKeypair("secp256k1")
    signer = createJwtSigner(keypair)
    issuerDid = createDidKeyUri(keypair)
  })

  it("generates a paymentRequestToken", async () => {
    const paymentRequestToken = await createPaymentRequestToken(
      paymentRequest,
      {
        issuer: issuerDid,
        signer,
        algorithm: curveToJwtAlgorithm(keypair.curve),
      },
    )

    expect(isJwtString(paymentRequestToken)).toBe(true)
  })

  it("generates a valid jwt payment request token", async () => {
    const paymentRequestToken = await createPaymentRequestToken(
      paymentRequest,
      {
        issuer: issuerDid,
        signer,
        algorithm: curveToJwtAlgorithm(keypair.curve),
      },
    )

    const resolver = getDidResolver()
    resolver.addToCache(
      issuerDid,
      createDidDocumentFromKeypair({
        did: issuerDid,
        keypair,
      }),
    )

    // Verify the JWT is valid (disable audience validation)
    // TODO: Use parsePaymentRequestToken when it returns the issuer
    const result = await verifyJwt(paymentRequestToken, {
      resolver,
    })

    expect(result.payload.iss).toBe(issuerDid)
    expect(result.payload.sub).toBe(paymentRequest.id)
  })

  it("does not let a smuggled exp claim override expiresAt-derived JWT exp", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const farFutureExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
    const requestWithSmuggledExp = {
      ...v.parse(paymentRequestSchema, { ...paymentRequestInit, expiresAt }),
      exp: farFutureExp,
    } as PaymentRequestInit & { exp: number }

    const paymentRequestToken = await createPaymentRequestToken(
      // Simulate an unprojected caller object that includes reserved JWT claims.
      requestWithSmuggledExp as unknown as typeof paymentRequest,
      {
        issuer: issuerDid,
        signer,
        algorithm: curveToJwtAlgorithm(keypair.curve),
      },
    )

    const resolver = getDidResolver()
    resolver.addToCache(
      issuerDid,
      createDidDocumentFromKeypair({
        did: issuerDid,
        keypair,
      }),
    )

    const result = await verifyJwt(paymentRequestToken, { resolver })
    const expectedExp = Math.floor(expiresAt.getTime() / 1000)

    expect(result.payload.exp).toBeDefined()
    expect(result.payload.exp).not.toBe(farFutureExp)
    // Allow a few seconds of clock skew between mint and assertion.
    expect(Math.abs((result.payload.exp as number) - expectedExp)).toBeLessThan(
      5,
    )
  })
})
