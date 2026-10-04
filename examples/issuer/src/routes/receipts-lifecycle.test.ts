import {
  bytesToHexString,
  createJwt,
  createPaymentReceipt,
  createStatusListCredential,
  curveToJwtAlgorithm,
  DidResolver,
  getDidResolver,
  makeRevocable,
  parseJwtCredential,
  signCredential,
  verifyPaymentReceipt,
  verifyPaymentRequestToken,
  type JwtString,
} from "agentcommercekit"
import { BitBuffer } from "bit-buffers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getCredential, revokeCredential } from "@/db/queries/credentials"
import type { DatabaseCredential } from "@/db/schema"
import {
  createDidWebWithSigner,
  type DidWithSigner,
} from "@/test-helpers/did-web-with-signer"

import app from ".."

// Keep signatures, JWT expiry, receipt verification, middleware, and the route
// real. Replace only persistence and remote key/status-list transport.
vi.mock("agentcommercekit", async () => {
  const actual =
    await vi.importActual<typeof import("agentcommercekit")>("agentcommercekit")
  return { ...actual, getDidResolver: vi.fn<typeof actual.getDidResolver>() }
})

vi.mock("@/db/queries/credentials", async () => {
  const actual = await vi.importActual<
    typeof import("@/db/queries/credentials")
  >("@/db/queries/credentials")
  return {
    ...actual,
    getCredential: vi.fn<typeof actual.getCredential>(),
    revokeCredential: vi.fn<typeof actual.revokeCredential>(),
  }
})

async function revokeAs(principal: DidWithSigner, expiresIn = 60) {
  // The management command is newly signed at the current time. Its own
  // expiry must remain enforced even when the embedded quote is historical.
  const payload = await createJwt(
    { id: 1, exp: Math.floor(Date.now() / 1000) + expiresIn },
    { issuer: principal.did, signer: principal.signer },
  )
  return app.request("/credentials/receipts", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  })
}

describe("receipt revocation after its payment request expires", () => {
  const issuedAt = Date.parse("2026-10-03T10:00:00Z")
  const afterQuoteExpiry = issuedAt + 60 * 60 * 1000
  let resolver: DidResolver
  let seller: DidWithSigner
  let stranger: DidWithSigner
  let receiptIssuer: DidWithSigner
  let paymentRequestToken: JwtString
  let receiptJwt: JwtString
  let storedCredential: DatabaseCredential

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(issuedAt)
    resolver = new DidResolver()
    vi.mocked(getDidResolver).mockReturnValue(resolver)
    seller = await createDidWebWithSigner("https://seller.example.com", {
      resolver,
    })
    stranger = await createDidWebWithSigner("https://stranger.example.com", {
      resolver,
    })
    receiptIssuer = await createDidWebWithSigner("https://issuer.example.com", {
      resolver,
    })
    vi.stubEnv("BASE_URL", "https://issuer.example.com")
    vi.stubEnv(
      "ISSUER_PRIVATE_KEY",
      bytesToHexString(receiptIssuer.keypair.privateKey),
    )
    vi.stubEnv("ALLOW_UNSIGNED_PAYLOADS", "false")

    // Use an actual JWT exp: PaymentRequest.expiresAt is a different field.
    paymentRequestToken = await createJwt(
      {
        id: "subscription-quote",
        sub: "subscription-quote",
        exp: issuedAt / 1000 + 60,
        paymentOptions: [
          {
            id: "usd",
            amount: 100,
            decimals: 2,
            currency: "USD",
            recipient: seller.did,
          },
        ],
      },
      { issuer: seller.did, signer: seller.signer },
      { alg: curveToJwtAlgorithm(seller.keypair.curve) },
    )

    const statusListUrl = "https://issuer.example.com/status/1"
    const credential = makeRevocable(
      createPaymentReceipt({
        paymentRequestToken,
        paymentOptionId: "usd",
        issuer: receiptIssuer.did,
        payerDid: "did:web:payer.example.com",
        expirationDate: new Date(issuedAt + 24 * 60 * 60 * 1000),
      }),
      { id: `${statusListUrl}#1`, statusListIndex: 1, statusListUrl },
    )
    const signer = { did: receiptIssuer.did, signer: receiptIssuer.signer }
    receiptJwt = await signCredential(credential, signer)
    const statusList = createStatusListCredential({
      url: statusListUrl,
      issuer: receiptIssuer.did,
      encodedList: new BitBuffer(131072).toBitstring(),
    })
    const signedList = await parseJwtCredential(
      await signCredential(statusList, signer),
      resolver,
    )
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (url) => {
        if (url !== statusListUrl) {
          throw new Error("Unexpected fetch outside the status-list fixture")
        }
        return Response.json(signedList)
      }),
    )
    storedCredential = {
      id: 1,
      credentialType: "PaymentReceiptCredential",
      baseCredential: credential,
      issuedAt: new Date(issuedAt),
      revokedAt: null,
    }
    vi.mocked(getCredential).mockResolvedValue(storedCredential)
    vi.mocked(revokeCredential).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it("allows the original seller to revoke before quote expiry", async () => {
    const response = await revokeAs(seller)
    expect(response.status).toBe(200)
    expect(revokeCredential).toHaveBeenCalledOnce()
  })

  it("allows the original seller to revoke a valid receipt after quote expiry", async () => {
    await expect(
      verifyPaymentRequestToken(paymentRequestToken, { resolver }),
    ).resolves.toBeDefined()
    vi.setSystemTime(afterQuoteExpiry)
    await expect(
      verifyPaymentRequestToken(paymentRequestToken, { resolver }),
    ).rejects.toThrow("Invalid payment request token")
    const verified = await verifyPaymentReceipt(receiptJwt, {
      resolver,
      trustedReceiptIssuers: [receiptIssuer.did],
      paymentRequestIssuer: seller.did,
    })
    expect(verified.paymentRequest?.id).toBe("subscription-quote")

    const response = await revokeAs(seller)
    // Including the body makes the unmodified route's exact rejection visible.
    expect({
      status: response.status,
      body: await response.json(),
      revocations: vi.mocked(revokeCredential).mock.calls.length,
    }).toEqual({
      status: 200,
      body: { ok: true, data: null },
      revocations: 1,
    })
    expect(revokeCredential).toHaveBeenCalledOnce()
  })

  it("rejects a different seller after quote expiry", async () => {
    vi.setSystemTime(afterQuoteExpiry)
    const response = await revokeAs(stranger)
    expect(response.status).toBe(401)
    expect(revokeCredential).not.toHaveBeenCalled()
  })

  it("rejects an expired management command after quote expiry", async () => {
    vi.setSystemTime(afterQuoteExpiry)
    const response = await revokeAs(seller, -3600)
    expect(response.status).toBe(401)
    expect(revokeCredential).not.toHaveBeenCalled()
  })

  it("rejects a forged historical quote signature after quote expiry", async () => {
    vi.setSystemTime(afterQuoteExpiry)
    const signatureStart = paymentRequestToken.lastIndexOf(".") + 1
    const forgedToken =
      paymentRequestToken.slice(0, signatureStart) +
      (paymentRequestToken[signatureStart] === "A" ? "B" : "A") +
      paymentRequestToken.slice(signatureStart + 1)
    storedCredential.baseCredential.credentialSubject.paymentRequestToken =
      forgedToken

    const response = await revokeAs(seller)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      error: "Invalid payment request token",
    })
    expect(revokeCredential).not.toHaveBeenCalled()
  })
})
