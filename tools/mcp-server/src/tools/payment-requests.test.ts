import {
  createDidKeyUri,
  createJwtSigner,
  createSignedPaymentRequest,
  generateKeypair,
  verifyPaymentRequestToken,
  getDidResolver,
  type DidUri,
  type PaymentRequestInit,
} from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg } from "../util"

const resolver = getDidResolver()

describe("payment tool operations", () => {
  it("creates and verifies a payment request token", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const signer = createJwtSigner(keypair)

    const init: PaymentRequestInit = {
      id: crypto.randomUUID(),
      description: "Test payment",
      paymentOptions: [
        {
          id: "option-1",
          amount: 100,
          decimals: 6,
          currency: "USDC",
          recipient: "0x1234567890abcdef1234567890abcdef12345678",
        },
      ],
    }

    const { paymentRequest, paymentRequestToken } =
      await createSignedPaymentRequest(init, {
        issuer: did,
        signer,
        algorithm: curveToAlg(keypair.curve),
      })

    expect(paymentRequest.id).toBe(init.id)
    expect(paymentRequestToken).toMatch(/^eyJ/)

    // Verify the token
    const { paymentRequest: verified } = await verifyPaymentRequestToken(
      paymentRequestToken,
      { resolver },
    )

    expect(verified.id).toBe(init.id)
    expect(verified.paymentOptions[0]!.currency).toBe("USDC")
  })

  it("rejects a payment request with wrong issuer", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const signer = createJwtSigner(keypair)

    const { paymentRequestToken } = await createSignedPaymentRequest(
      {
        id: crypto.randomUUID(),
        paymentOptions: [
          {
            id: "opt-1",
            amount: 50,
            decimals: 6,
            currency: "USDC",
            recipient: "0xrecipient",
          },
        ],
      },
      { issuer: did, signer, algorithm: "ES256K" },
    )

    await expect(
      verifyPaymentRequestToken(paymentRequestToken, {
        resolver,
        issuer: "did:key:z6MkWrongIssuer",
      }),
    ).rejects.toThrow()
  })
})
