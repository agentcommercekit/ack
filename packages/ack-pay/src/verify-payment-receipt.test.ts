import {
  createDidKeyUri,
  createDidPkhUri,
  getDidResolver,
  type DidUri,
  type Resolvable,
} from "@agentcommercekit/did"
import {
  createJwtSigner,
  curveToJwtAlgorithm,
  type JwtString,
} from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import {
  InvalidCredentialError,
  parseJwtCredential,
  signCredential,
  type Verifiable,
  type W3CCredential,
} from "@agentcommercekit/vc"
import { beforeEach, describe, expect, it } from "vitest"

import type { PaymentRequestInit } from "./payment-request"

import { createPaymentReceipt } from "./create-payment-receipt"
import { createSignedPaymentRequest } from "./create-signed-payment-request"
import { InvalidPaymentRequestTokenError } from "./errors"
import { verifyPaymentReceipt } from "./verify-payment-receipt"

describe("verifyPaymentReceipt()", () => {
  let resolver: Resolvable
  let unsignedReceipt: W3CCredential
  let signedReceipt: Verifiable<W3CCredential>
  let signedReceiptJwt: JwtString
  let receiptIssuerDid: DidUri
  let paymentRequestIssuerDid: DidUri

  beforeEach(async () => {
    const receiptIssuerKeypair = await generateKeypair("secp256k1")
    receiptIssuerDid = createDidKeyUri(receiptIssuerKeypair)
    const paymentRequestIssuerKeypair = await generateKeypair("secp256k1")
    paymentRequestIssuerDid = createDidKeyUri(paymentRequestIssuerKeypair)

    resolver = getDidResolver()

    const paymentRequestInit: PaymentRequestInit = {
      id: "test-request-id",
      paymentOptions: [
        {
          id: "test-payment-option-id",
          amount: 100,
          decimals: 2,
          currency: "USD",
          network: "eip155:84532",
          recipient: "0x592D4858DE40BC81A77E5B373238B70D7C79D3C79",
        },
      ],
    }

    const { paymentRequestToken, paymentRequest } =
      await createSignedPaymentRequest(paymentRequestInit, {
        issuer: paymentRequestIssuerDid,
        signer: createJwtSigner(paymentRequestIssuerKeypair),
        algorithm: curveToJwtAlgorithm(paymentRequestIssuerKeypair.curve),
      })

    unsignedReceipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId: paymentRequest.paymentOptions[0].id,
      issuer: receiptIssuerDid,
      payerDid: createDidPkhUri(
        "eip155:84532",
        "0x7B3D8F2E1C9A4B5D6E7F8A9B0C1D2E3F4A5B6C",
      ),
    })

    signedReceiptJwt = await signCredential(unsignedReceipt, {
      did: receiptIssuerDid,
      signer: createJwtSigner(receiptIssuerKeypair),
    })

    signedReceipt = await parseJwtCredential(signedReceiptJwt, resolver)
  })

  it("validates a JWT receipt string", async () => {
    const result = await verifyPaymentReceipt(signedReceiptJwt, { resolver })
    expect(result.receipt).toBeDefined()
    expect(result.paymentRequestToken).toBeDefined()
    expect(result.paymentRequest).toBeDefined()
  })

  it("validates a parsed credential", async () => {
    const result = await verifyPaymentReceipt(signedReceipt, {
      resolver,
    })
    expect(result.receipt).toBeDefined()
    expect(result.paymentRequestToken).toBeDefined()
    expect(result.paymentRequest).toBeDefined()
  })

  it("throws for an invalid JWT receipt", async () => {
    await expect(
      verifyPaymentReceipt("invalid-jwt", { resolver }),
    ).rejects.toThrow(InvalidCredentialError)
  })

  it("throws for invalid credential subject", async () => {
    const invalidCredential = {
      ...unsignedReceipt,
      credentialSubject: { paymentRequestToken: null },
    }

    await expect(
      // @ts-expect-error -- forcing a bad credential here
      verifyPaymentReceipt(invalidCredential, { resolver }),
    ).rejects.toThrow(InvalidCredentialError)
  })

  it("skips payment request token verification when disabled", async () => {
    const result = await verifyPaymentReceipt(signedReceiptJwt, {
      resolver,
      verifyPaymentRequestTokenJwt: false,
    })
    expect(result.receipt).toBeDefined()
    expect(result.paymentRequestToken).toBeDefined()
    expect(result.paymentRequest).toBeNull()
  })

  it("validates payment request token issuer when specified", async () => {
    const result = await verifyPaymentReceipt(signedReceiptJwt, {
      resolver,
      paymentRequestIssuer: paymentRequestIssuerDid,
    })
    expect(result.receipt).toBeDefined()
    expect(result.paymentRequestToken).toBeDefined()
    expect(result.paymentRequest).toBeDefined()
  })

  it("throws for invalid payment request token issuer", async () => {
    await expect(
      verifyPaymentReceipt(signedReceiptJwt, {
        resolver,
        paymentRequestIssuer: "did:example:wrong-issuer",
      }),
    ).rejects.toThrow(InvalidPaymentRequestTokenError)
  })

  it("validates trusted receipt issuers", async () => {
    const result = await verifyPaymentReceipt(signedReceiptJwt, {
      resolver,
      trustedReceiptIssuers: [receiptIssuerDid],
    })
    expect(result.receipt).toBeDefined()
    expect(result.paymentRequestToken).toBeDefined()
    expect(result.paymentRequest).toBeDefined()
  })

  it("throws for untrusted receipt issuer", async () => {
    await expect(
      verifyPaymentReceipt(signedReceiptJwt, {
        resolver,
        trustedReceiptIssuers: ["did:example:wrong-issuer"],
      }),
    ).rejects.toThrow()
  })
})
