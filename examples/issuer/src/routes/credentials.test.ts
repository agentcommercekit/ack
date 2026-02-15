import {
  bytesToHexString,
  createControllerCredential,
  createJwt,
  DidResolver,
  getDidResolver,
} from "agentcommercekit"
import { credentialSchema } from "agentcommercekit/schemas/valibot"
import * as v from "valibot"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { DatabaseClient } from "@/db/get-db"
import type { DatabaseCredential } from "@/db/schema"

import { getCredential } from "@/db/queries/credentials"
import {
  createDidWebWithSigner,
  type DidWithSigner,
} from "@/test-helpers/did-web-with-signer"

import app from ".."

// Mock the DID resolver
vi.mock("agentcommercekit", async () => {
  const actual = await vi.importActual("agentcommercekit")
  return {
    ...actual,
    getDidResolver: vi.fn(),
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
        >,
      ): Promise<DatabaseCredential> =>
        Promise.resolve({
          id: 1,
          credentialType: credential.credentialType,
          baseCredential: credential.baseCredential,
          issuedAt: new Date(),
          revokedAt: null,
        }),
    ),
    getCredential: vi.fn().mockImplementation(async (_db, id: number) => {
      return Promise.resolve({
        id,
        credentialType: "ControllerCredential",
        baseCredential: createControllerCredential({
          controller: "did:web:controller.example.com",
          subject: "did:web:subject.example.com",
          issuer: "did:web:issuer.example.com",
        }),
      })
    }),
    revokeCredential: vi.fn(),
  }
})

const responseSchema = v.object({
  ok: v.literal(true),
  data: v.object({
    credential: credentialSchema,
    jwt: v.string(),
  }),
})

describe("POST /credentials/controller", () => {
  let issuer: DidWithSigner
  let controller: DidWithSigner
  let target: DidWithSigner

  beforeAll(async () => {
    issuer = await createDidWebWithSigner("https://issuer.example.com")
    controller = await createDidWebWithSigner("https://controller.example.com")
    target = await createDidWebWithSigner(`https://target.example.com`, {
      controller: controller.did,
    })

    process.env.ISSUER_PRIVATE_KEY = bytesToHexString(issuer.keypair.privateKey)
    process.env.BASE_URL = "https://issuer.example.com"
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("generates a credential", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(target.did, target.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: controller.did,
      subject: target.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(200)
    const { success, output } = v.safeParse(responseSchema, await res.json())

    if (!success) {
      throw new Error("Invalid response")
    }

    expect(output.data).toBeDefined()
  })

  it("responds with an error when the target DID does not have a controller listed", async () => {
    const resolver = new DidResolver()
    const targetNoController = await createDidWebWithSigner(
      `https://stray.example.com`,
    )
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(targetNoController.did, targetNoController.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: controller.did,
      subject: targetNoController.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: `DID ${targetNoController.did} is missing a controller`,
      ok: false,
    })
  })

  it("responds with an error when the target DID has a different controller listed", async () => {
    const resolver = new DidResolver()
    const targetBadController = await createDidWebWithSigner(
      `https://target2.example.com`,
      { controller: issuer.did }, // Uses the 'issuer' instead of the `controller`
    )
    resolver.addToCache(issuer.did, issuer.didDocument)
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(
      targetBadController.did,
      targetBadController.didDocument,
    )
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: controller.did,
      subject: targetBadController.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      error: "Target controller does not match",
      ok: false,
    })
  })

  it("responds with an error when the payload is not signed by the controller did", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    resolver.addToCache(target.did, target.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: controller.did,
      subject: target.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: target.did, // The target attempting to prove ownership
      signer: target.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Target controller does not match",
    })
  })

  it("errors when unable to resolve the signature DID", async () => {
    const resolver = new DidResolver()
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: controller.did,
      subject: target.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Invalid payload",
    })
  })

  it("validates the input", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: "not-a-valid-jwt",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
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
          received: '"not-a-valid-jwt"',
          input: "not-a-valid-jwt",
          message: "Invalid JWT format",
          path: [{ key: "payload", value: "not-a-valid-jwt" }],
        },
      ],
    })
  })

  it("validates the parsed payload", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const payload = {
      controller: "not-a-valid-did",
      subject: target.did,
    }

    const signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    const res = await app.request("/credentials/controller", {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
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
          received: '"not-a-valid-did"',
          input: "not-a-valid-did",
          message: "Invalid DID format",
          path: [{ key: "controller", value: "not-a-valid-did" }],
        },
      ],
    })
  })
})

describe("DELETE /credentials/controller", () => {
  let controller: DidWithSigner
  let signedPayload: string

  beforeAll(async () => {
    const issuer = await createDidWebWithSigner("https://issuer.example.com")
    controller = await createDidWebWithSigner("https://controller.example.com")

    const payload = {
      id: 1,
    }

    signedPayload = await createJwt(payload, {
      issuer: controller.did,
      signer: controller.signer,
    })

    process.env.ISSUER_PRIVATE_KEY = bytesToHexString(issuer.keypair.privateKey)
    process.env.BASE_URL = "https://issuer.example.com"
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("deletes a controller credential", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const res = await app.request("/credentials/controller", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      data: null,
    })
  })

  it("throws an error if credential is not found", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)
    vi.mocked(getCredential).mockResolvedValueOnce(undefined)

    const res = await app.request("/credentials/controller", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Credential not found",
    })
  })

  it("throws an error if credential controller is not the request signer", async () => {
    const resolver = new DidResolver()
    const differentController = await createDidWebWithSigner(
      "https://different-controller.example.com",
    )
    resolver.addToCache(
      differentController.did,
      differentController.didDocument,
    )
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const signedPayload = await createJwt(
      { id: 1 },
      {
        issuer: differentController.did,
        signer: differentController.signer,
      },
    )

    const res = await app.request("/credentials/controller", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(401)

    expect(await res.json()).toEqual({
      ok: false,
      error: "Unauthorized",
    })
  })

  it("throws an error if stored credential is invalid", async () => {
    const resolver = new DidResolver()
    resolver.addToCache(controller.did, controller.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)

    const invalidCredential = createControllerCredential({
      controller: "did:web:controller.example.com",
      subject: "did:web:subject.example.com",
      issuer: "did:web:issuer.example.com",
    })

    delete invalidCredential.credentialSubject.controller

    vi.mocked(getCredential).mockResolvedValueOnce({
      id: 1,
      credentialType: "ControllerCredential",
      baseCredential: invalidCredential,
    } as DatabaseCredential)

    const res = await app.request("/credentials/controller", {
      method: "DELETE",
      body: JSON.stringify({
        payload: signedPayload,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
    })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      ok: false,
      error: "Invalid stored credential",
    })
  })
})
