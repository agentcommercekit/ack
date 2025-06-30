import {
  DidResolver,
  bytesToHexString,
  createJwt,
  createPaymentReceipt,
  createPaymentRequestBody,
  curveToJwtAlgorithm,
  getDidResolver,
  verifyPaymentToken
} from "agentcommercekit"
import {
  credentialSchema,
  paymentRequestSchema
} from "agentcommercekit/schemas/valibot"
import * as v from "valibot"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getCredential } from "@/db/queries/credentials"
import { createDidWebWithSigner } from "@/test-helpers/did-web-with-signer"
import app from ".."
import type { DatabaseClient } from "@/db/get-db"
import type { DatabaseCredential } from "@/db/schema"
import type { DidWithSigner } from "@/test-helpers/did-web-with-signer"
import type { PaymentRequestInit } from "agentcommercekit"

vi.mock("agentcommercekit", async () => {
  const actual = await vi.importActual("agentcommercekit")
  return {
    ...actual,
    verifyPaymentToken: vi.fn(),
    getDidResolver: vi.fn()
  }
})

vi.mock("@/db/queries/credentials", async () => {
  const actual = await vi.importActual("@/db/queries/credentials")
  return {
    ...actual,
    createCredential: vi.fn().mockImplementation(
      async (
        _db: DatabaseClient,
        credential: Omit<
          DatabaseCredential,
          "id" | "statusListIndex" | "issuedAt" | "revokedAt"
        >
      ): Promise<DatabaseCredential> =>
        Promise.resolve({
          id: 1,
          credentialType: credential.credentialType,
          baseCredential: credential.baseCredential,
          issuedAt: new Date(),
          revokedAt: null
        })
    ),
    getCredential: vi.fn().mockImplementation(async (_db, id: string) => {
      return Promise.resolve({
        id,
        credentialType: "PaymentReceiptCredential",
        baseCredential: createPaymentReceipt({
          paymentToken: "test.payment.token",
          paymentOptionId: "test-payment-option-id",
          issuer: "did:web:issuer.example.com",
          payerDid: "did:web:payer.example.com"
        })
      })
    }),
    revokeCredential: vi.fn()
  }
})

const responseSchema = v.object({
  ok: v.literal(true),
  data: v.object({
    credential: credentialSchema,
    jwt: v.string()
  })
})

const paymentRequestInit: PaymentRequestInit = {
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
}

const paymentRequest = v.parse(paymentRequestSchema, paymentRequestInit)

async function generatePayload(
  payer: DidWithSigner,
  resourceServer: DidWithSigner,
  paymentService: DidWithSigner
) {
  const { paymentToken, paymentRequest } = await createPaymentRequestBody(
    paymentRequestInit,
    {
      issuer: resourceServer.did,
      signer: resourceServer.signer,
      algorithm: curveToJwtAlgorithm(resourceServer.keypair.curve)
    }
  )

  const payload = {
    paymentToken,
    paymentOptionId: paymentRequest.paymentOptions[0].id,
    metadata: {
      txHash: "test-tx-hash"
    },
    payerDid: payer.did
  }

  const signedPayload = await createJwt(payload, {
    issuer: paymentService.did,
    signer: paymentService.signer
  })

  return signedPayload
}

describe("POST /credentials/receipts", () => {
  let resolver: DidResolver
  let issuer: DidWithSigner
  let payer: DidWithSigner
  let resourceServer: DidWithSigner
  let paymentService: DidWithSigner

  beforeEach(async () => {
    resolver = new DidResolver()
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    issuer = await createDidWebWithSigner("https://issuer.example.com", {
      resolver
    })
    payer = await createDidWebWithSigner("https://payer.example.com", {
      resolver
    })
    resourceServer = await createDidWebWithSigner(
      "https://resource-server.example.com",
      {
        resolver
      }
    )
    paymentService = await createDidWebWithSigner(
      "https://payment-service.example.com",
      {
        resolver
      }
    )

    process.env.ISSUER_PRIVATE_KEY = bytesToHexString(issuer.keypair.privateKey)
    process.env.BASE_URL = "https://issuer.example.com"

    vi.mocked(verifyPaymentToken).mockResolvedValue({
      paymentRequest,
      // @ts-expect-error - Not a full parsed JWT
      parsed: {
        payload: paymentRequestInit,
        issuer: resourceServer.did,
        verified: true
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("generates a credential", async () => {
    const signedPayload = await generatePayload(
      payer,
      resourceServer,
      paymentService
    )

    const res = await app.request("/credentials/receipts", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(200)
    const { success, output } = v.safeParse(responseSchema, await res.json())

    if (!success) {
      throw new Error("Failed to parse response")
    }

    expect(output.data).toBeDefined()

    expect(output.data.credential.type).toContain("PaymentReceiptCredential")
    expect(output.data.credential.credentialSubject.id).toBe(payer.did)
  })

  it("errors when unable to resolve the signature DID", async () => {
    resolver.removeFromCache(paymentService.did)

    const signedPayload = await generatePayload(
      payer,
      resourceServer,
      paymentService
    )

    const res = await app.request("/credentials/receipts", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Invalid payload"
    })
  })

  it("validates the parsed payload", async () => {
    const signedPayload = await createJwt(
      {
        paymentToken: "test.jwt.token",
        paymentOptionId: "test-payment-option-id",
        metadata: {
          txHash: "test-tx-hash"
        },
        payerDid: "invalid-did"
      },
      {
        issuer: paymentService.did,
        signer: paymentService.signer
      }
    )

    const res = await app.request("/credentials/receipts", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "Invalid request",
      issues: [
        {
          kind: "schema",
          type: "custom",
          expected: "unknown",
          received: '"invalid-did"',
          input: "invalid-did",
          message: "Invalid DID format",
          path: [{ key: "payerDid", value: "invalid-did" }]
        }
      ]
    })
  })
})

describe("DELETE /credentials/receipts", () => {
  let resolver: DidResolver
  let tokenIssuer: DidWithSigner
  let signedPayload: string

  beforeEach(async () => {
    resolver = new DidResolver()
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const issuer = await createDidWebWithSigner("https://issuer.example.com", {
      resolver
    })

    tokenIssuer = await createDidWebWithSigner(
      "https://token-issuer.example.com",
      {
        resolver
      }
    )

    const payload = {
      id: 1
    }

    signedPayload = await createJwt(payload, {
      issuer: tokenIssuer.did,
      signer: tokenIssuer.signer
    })

    process.env.ISSUER_PRIVATE_KEY = bytesToHexString(issuer.keypair.privateKey)
    process.env.BASE_URL = "https://issuer.example.com"

    vi.mocked(verifyPaymentToken).mockResolvedValue({
      paymentRequest,
      // @ts-expect-error - Not a full parsed JWT
      parsed: {
        issuer: tokenIssuer.did,
        payload: paymentRequestInit,
        verified: true
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("deletes a receipt credential", async () => {
    const res = await app.request("/credentials/receipts", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      data: null
    })
  })

  it("throws an error if credential is not found", async () => {
    vi.mocked(getCredential).mockResolvedValueOnce(undefined)

    const res = await app.request("/credentials/receipts", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Credential not found"
    })
  })

  it("throws an error if token issuer is not the request signer", async () => {
    const unknownSigner = await createDidWebWithSigner(
      "https://unknown-signer.example.com",
      {
        resolver
      }
    )

    const signedPayload = await createJwt(
      { id: 1 },
      {
        issuer: unknownSigner.did,
        signer: unknownSigner.signer
      }
    )

    const res = await app.request("/credentials/receipts", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(401)

    expect(await res.json()).toEqual({
      ok: false,
      error: "Unauthorized"
    })
  })

  it("throws an error if stored credential is invalid", async () => {
    const invalidCredential = createPaymentReceipt({
      paymentToken: "test.payment.token",
      paymentOptionId: "test-payment-option-id",
      issuer: "did:web:issuer.example.com",
      payerDid: "did:web:payer.example.com"
    })

    delete invalidCredential.credentialSubject.paymentToken

    vi.mocked(getCredential).mockResolvedValueOnce({
      id: 1,
      credentialType: "PaymentReceiptCredential",
      baseCredential: invalidCredential
    } as DatabaseCredential)

    const res = await app.request("/credentials/receipts", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload
      }),
      headers: new Headers({ "Content-Type": "application/json" })
    })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Invalid stored credential"
    })
  })
})
