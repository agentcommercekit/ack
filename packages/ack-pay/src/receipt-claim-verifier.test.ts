import { createDidKeyUri, getDidResolver } from "@agentcommercekit/did"
import { createJwtSigner, curveToJwtAlgorithm } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { InvalidCredentialSubjectError } from "@agentcommercekit/vc"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import { createPaymentToken } from "./create-payment-token"
import { getReceiptClaimVerifier } from "./receipt-claim-verifier"
import { paymentRequestSchema } from "./schemas/valibot"
import type { paymentReceiptClaimSchema } from "./schemas/valibot"

describe("getReceiptClaimVerifier", () => {
  const resolver = getDidResolver()

  it("accepts PaymentReceiptCredential type", () => {
    const verifier = getReceiptClaimVerifier()
    expect(verifier.accepts(["PaymentReceiptCredential"])).toBe(true)
    expect(verifier.accepts(["OtherCredentialType"])).toBe(false)
  })

  it("does not accept other credential types", () => {
    const verifier = getReceiptClaimVerifier()
    expect(verifier.accepts(["OtherCredentialType"])).toBe(false)
  })

  it("throws for invalid credential subject structure", async () => {
    const verifier = getReceiptClaimVerifier()

    const invalidSubject = {
      paymentToken: null
    }

    await expect(verifier.verify(invalidSubject, resolver)).rejects.toThrow(
      InvalidCredentialSubjectError
    )
  })

  it("verifies valid receipt claim", async () => {
    const keypair = await generateKeypair("secp256k1")
    const signer = createJwtSigner(keypair)
    const issuerDid = createDidKeyUri(keypair)
    const paymentRequest = v.parse(paymentRequestSchema, {
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

    const paymentToken = await createPaymentToken(paymentRequest, {
      issuer: issuerDid,
      signer,
      algorithm: curveToJwtAlgorithm(keypair.curve)
    })
    const receiptSubject: v.InferOutput<typeof paymentReceiptClaimSchema> = {
      paymentOptionId: paymentRequest.paymentOptions[0].id,
      paymentToken
    }

    const verifier = getReceiptClaimVerifier()

    await expect(
      verifier.verify(receiptSubject, resolver)
    ).resolves.not.toThrow()
  })
})
