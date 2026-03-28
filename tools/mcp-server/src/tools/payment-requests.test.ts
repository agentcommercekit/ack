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

  it("creates a payment request with expiresInSeconds and verifies expiry is set", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const signer = createJwtSigner(keypair)

    const before = Date.now()
    const expiresInSeconds = 3600

    const { paymentRequest } = await createSignedPaymentRequest(
      {
        id: crypto.randomUUID(),
        paymentOptions: [
          {
            id: "opt-1",
            amount: 100,
            decimals: 6,
            currency: "USDC",
            recipient: "0x1234567890abcdef1234567890abcdef12345678",
          },
        ],
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      },
      { issuer: did, signer, algorithm: curveToAlg(keypair.curve) },
    )

    const expiresAt = new Date(paymentRequest.expiresAt!).getTime()
    const expectedMin = before + expiresInSeconds * 1000
    const expectedMax = Date.now() + expiresInSeconds * 1000

    expect(expiresAt).toBeGreaterThanOrEqual(expectedMin)
    expect(expiresAt).toBeLessThanOrEqual(expectedMax)
  })

  it("requires at least one payment option", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const signer = createJwtSigner(keypair)

    await expect(
      createSignedPaymentRequest(
        {
          id: crypto.randomUUID(),
          paymentOptions: [] as unknown as [{ id: string; amount: number; decimals: number; currency: string; recipient: string }],
        },
        { issuer: did, signer, algorithm: curveToAlg(keypair.curve) },
      ),
    ).rejects.toThrow()
  })
})
