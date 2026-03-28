import {
  createDidKeyUri,
  createJwtSigner,
  createPaymentReceipt,
  createSignedPaymentRequest,
  generateKeypair,
  getDidResolver,
  signCredential,
  verifyPaymentReceipt,
  type DidUri,
} from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg } from "../util"

const resolver = getDidResolver()

async function createTestPaymentRequest() {
  const keypair = await generateKeypair("secp256k1")
  const did = createDidKeyUri(keypair)
  const signer = createJwtSigner(keypair)

  const { paymentRequestToken } = await createSignedPaymentRequest(
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
    },
    { issuer: did, signer, algorithm: curveToAlg(keypair.curve) },
  )

  return { keypair, did, signer, paymentRequestToken }
}

describe("payment receipt operations", () => {
  it("creates, signs, and verifies a payment receipt", async () => {
    const { keypair, did, paymentRequestToken } =
      await createTestPaymentRequest()

    const payerKeypair = await generateKeypair("secp256k1")
    const payerDid = createDidKeyUri(payerKeypair)

    const receipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId: "opt-1",
      issuer: did,
      payerDid,
    })

    expect(receipt.type).toContain("PaymentReceiptCredential")

    const signedReceipt = await signCredential(receipt, {
      did,
      signer: createJwtSigner(keypair),
      alg: curveToAlg(keypair.curve),
    })

    const result = await verifyPaymentReceipt(signedReceipt, {
      resolver,
      trustedReceiptIssuers: [did],
    })

    expect(result.receipt).toBeDefined()
  })

  it("rejects a receipt from an untrusted issuer", async () => {
    const { keypair, did, paymentRequestToken } =
      await createTestPaymentRequest()

    const payerKeypair = await generateKeypair("secp256k1")
    const payerDid = createDidKeyUri(payerKeypair)

    const receipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId: "opt-1",
      issuer: did,
      payerDid,
    })

    const signedReceipt = await signCredential(receipt, {
      did,
      signer: createJwtSigner(keypair),
      alg: curveToAlg(keypair.curve),
    })

    const otherKeypair = await generateKeypair("secp256k1")
    const untrustedDid = createDidKeyUri(otherKeypair)

    await expect(
      verifyPaymentReceipt(signedReceipt, {
        resolver,
        trustedReceiptIssuers: [untrustedDid],
      }),
    ).rejects.toThrow()
  })

  it("rejects a receipt with wrong payment request issuer", async () => {
    const { keypair, did, paymentRequestToken } =
      await createTestPaymentRequest()

    const payerKeypair = await generateKeypair("secp256k1")
    const payerDid = createDidKeyUri(payerKeypair)

    const receipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId: "opt-1",
      issuer: did,
      payerDid,
    })

    const signedReceipt = await signCredential(receipt, {
      did,
      signer: createJwtSigner(keypair),
      alg: curveToAlg(keypair.curve),
    })

    await expect(
      verifyPaymentReceipt(signedReceipt, {
        resolver,
        paymentRequestIssuer: "did:key:z6MkWrongIssuer" as DidUri,
      }),
    ).rejects.toThrow()
  })
})
