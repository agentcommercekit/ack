import { createDidKeyUri } from "@agentcommercekit/did"
import { createJwtSigner, curveToJwtAlgorithm } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys/ed25519"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createPaymentReceipt } from "./create-payment-receipt"
import { createPaymentRequestBody } from "./create-payment-request-body"
import type { PaymentRequestInit } from "./payment-request"

describe("createPaymentReceipt", () => {
  const date = new Date("2024-12-31T23:59:59Z")
  let paymentToken: string

  beforeAll(() => {
    vi.setSystemTime(date)
  })

  beforeEach(async () => {
    const keypair = await generateKeypair()

    const paymentRequest: PaymentRequestInit = {
      id: "test-payment-request-id",
      expiresAt: new Date("2024-12-31T23:59:59Z"),
      paymentOptions: [
        {
          id: "test-payment-option-id",
          amount: 100,
          decimals: 2,
          currency: "USD",
          recipient: "did:example:recipient"
        }
      ]
    }

    const paymentRequiredBody = await createPaymentRequestBody(paymentRequest, {
      issuer: createDidKeyUri(keypair),
      signer: createJwtSigner(keypair),
      algorithm: curveToJwtAlgorithm(keypair.curve)
    })

    paymentToken = paymentRequiredBody.paymentToken
  })

  it("creates a payment receipt with valid inputs", () => {
    const receipt = createPaymentReceipt({
      paymentToken,
      paymentOptionId: "test-payment-option-id",
      issuer: "did:example:issuer",
      payerDid: "did:example:payer"
    })

    expect(receipt).toMatchObject({
      type: ["VerifiableCredential", "PaymentReceiptCredential"],
      issuer: {
        id: "did:example:issuer"
      },
      issuanceDate: date.toISOString(),
      credentialSubject: {
        id: "did:example:payer",
        paymentToken
      }
    })
  })

  it("allows passing metadata for inclusion in the attestation", () => {
    const receipt = createPaymentReceipt({
      paymentToken,
      paymentOptionId: "test-payment-option-id",
      issuer: "did:example:issuer",
      payerDid: "did:example:payer",
      metadata: {
        test: "test"
      }
    })

    expect(receipt).toMatchObject({
      type: ["VerifiableCredential", "PaymentReceiptCredential"],
      issuer: {
        id: "did:example:issuer"
      },
      issuanceDate: date.toISOString(),
      credentialSubject: {
        id: "did:example:payer",
        paymentToken,
        metadata: {
          test: "test"
        }
      }
    })
  })

  it("creates a payment receipt with an expiration date", () => {
    const expirationDate = new Date("2024-12-31T23:59:59Z")
    const receipt = createPaymentReceipt({
      paymentToken,
      paymentOptionId: "test-payment-option-id",
      issuer: "did:example:issuer",
      payerDid: "did:example:payer",
      expirationDate
    })

    expect(receipt).toMatchObject({
      expirationDate: expirationDate.toISOString()
    })
  })
})
