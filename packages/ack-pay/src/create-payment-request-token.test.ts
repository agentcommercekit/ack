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
})
