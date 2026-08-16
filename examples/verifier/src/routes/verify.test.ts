import {
  bytesToHexString,
  createControllerCredential,
  createCredential,
  createDidWebDocumentFromKeypair,
  createDidWebUri,
  createJwtSigner,
  createPaymentReceipt,
  DidResolver,
  generateKeypair,
  getDidResolver,
  parseJwtCredential,
  signCredential,
  type DidUri,
  type Keypair,
} from "agentcommercekit"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import app from "../index"

// Mock the DID resolver to return our pre-populated cache
vi.mock("agentcommercekit", async () => {
  const actual = await vi.importActual("agentcommercekit")
  return {
    ...actual,
    getDidResolver: vi.fn<() => DidResolver>(),
  }
})

describe("Verifier Example Service", () => {
  let trustedIssuerKeypair: Keypair
  let trustedIssuerDid: DidUri
  let untrustedIssuerKeypair: Keypair
  let untrustedIssuerDid: DidUri
  let controllerKeypair: Keypair
  let controllerDid: DidUri
  let targetKeypair: Keypair
  let targetDid: DidUri
  let resolver: DidResolver

  beforeAll(async () => {
    // Trusted issuer as configured in verify.ts: http://localhost:3456
    trustedIssuerKeypair = await generateKeypair("secp256k1")
    trustedIssuerDid = createDidWebUri(new URL("http://localhost:3456"))

    // Untrusted issuer
    untrustedIssuerKeypair = await generateKeypair("secp256k1")
    untrustedIssuerDid = createDidWebUri(
      new URL("https://untrusted-issuer.example.com"),
    )

    // Controller and controlled agent
    controllerKeypair = await generateKeypair("secp256k1")
    controllerDid = createDidWebUri(new URL("https://controller.example.com"))

    targetKeypair = await generateKeypair("secp256k1")
    targetDid = createDidWebUri(new URL("https://target.example.com"))

    process.env.VERIFIER_PRIVATE_KEY = bytesToHexString(
      trustedIssuerKeypair.privateKey,
    )
    process.env.BASE_URL = "https://verifier.example.com"
  })

  beforeEach(() => {
    resolver = new DidResolver()

    // Add trusted issuer DID document
    const { didDocument: trustedIssuerDoc } = createDidWebDocumentFromKeypair({
      keypair: trustedIssuerKeypair,
      baseUrl: "http://localhost:3456",
      encoding: "jwk",
    })
    resolver.addToCache(trustedIssuerDid, trustedIssuerDoc)

    // Add untrusted issuer DID document
    const { didDocument: untrustedIssuerDoc } = createDidWebDocumentFromKeypair(
      {
        keypair: untrustedIssuerKeypair,
        baseUrl: "https://untrusted-issuer.example.com",
        encoding: "jwk",
      },
    )
    resolver.addToCache(untrustedIssuerDid, untrustedIssuerDoc)

    // Add controller DID document
    const { didDocument: controllerDoc } = createDidWebDocumentFromKeypair({
      keypair: controllerKeypair,
      baseUrl: "https://controller.example.com",
      encoding: "jwk",
    })
    resolver.addToCache(controllerDid, controllerDoc)

    // Add target agent DID document with controller set
    const { didDocument: targetDoc } = createDidWebDocumentFromKeypair({
      keypair: targetKeypair,
      baseUrl: "https://target.example.com",
      controller: controllerDid,
      encoding: "jwk",
    })
    resolver.addToCache(targetDid, targetDoc)

    vi.mocked(getDidResolver).mockReturnValue(resolver)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /verify", () => {
    it("verifies a valid JWT-encoded ControllerCredential", async () => {
      const baseCredential = createControllerCredential({
        issuer: trustedIssuerDid,
        controller: controllerDid,
        subject: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: jwt }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        ok: true,
        data: null,
      })
    })

    it("verifies a valid JSON-object ControllerCredential", async () => {
      const baseCredential = createControllerCredential({
        issuer: trustedIssuerDid,
        controller: controllerDid,
        subject: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const parsed = await parseJwtCredential(jwt, resolver)

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: parsed }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        ok: true,
        data: null,
      })
    })

    it("verifies a valid PaymentReceiptCredential", async () => {
      const baseCredential = createPaymentReceipt({
        paymentRequestToken: "test.jwt.token",
        paymentOptionId: "option-1",
        issuer: trustedIssuerDid,
        payerDid: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: jwt }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        ok: true,
        data: null,
      })
    })

    it("rejects a credential from an untrusted issuer", async () => {
      const baseCredential = createControllerCredential({
        issuer: untrustedIssuerDid,
        controller: controllerDid,
        subject: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: untrustedIssuerDid,
        signer: createJwtSigner(untrustedIssuerKeypair),
      })

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: jwt }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.ok).toBe(false)
      expect(json.error).toContain("Issuer is not trusted")
    })

    it("rejects a credential with an invalid or tampered proof", async () => {
      const baseCredential = createControllerCredential({
        issuer: trustedIssuerDid,
        controller: controllerDid,
        subject: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const parsed = await parseJwtCredential(jwt, resolver)
      // Tamper with the proof JWT signature
      const tampered = {
        ...parsed,
        proof: {
          ...parsed.proof,
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          jwt: (parsed.proof.jwt.slice(0, -5) +
            "xxxxx") as unknown as typeof parsed.proof.jwt,
        },
      }

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: tampered }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.ok).toBe(false)
      expect(json.error).toBe("Invalid proof")
    })

    it("rejects an expired credential", async () => {
      // Create credential expiring in 10 seconds
      const expirationDate = new Date(Date.now() + 10 * 1000)
      const baseCredential = createCredential({
        type: "ControllerCredential",
        issuer: trustedIssuerDid,
        subject: targetDid,
        expirationDate,
        attestation: {
          controller: controllerDid,
        },
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const parsed = await parseJwtCredential(jwt, resolver)

      // Advance time past expirationDate
      vi.useFakeTimers()
      vi.setSystemTime(new Date(Date.now() + 60 * 1000))

      try {
        const res = await app.request("/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: parsed }),
        })

        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.ok).toBe(false)
        expect(json.error).toBe("Credential is expired")
      } finally {
        vi.useRealTimers()
      }
    })

    it("rejects a controller credential with mismatched controller", async () => {
      const baseCredential = createControllerCredential({
        issuer: trustedIssuerDid,
        controller: untrustedIssuerDid, // Mismatched controller (target DID doc points to controllerDid)
        subject: targetDid,
      })

      const jwt = await signCredential(baseCredential, {
        did: trustedIssuerDid,
        signer: createJwtSigner(trustedIssuerKeypair),
      })

      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: jwt }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.ok).toBe(false)
      expect(json.error).toBe("Invalid controller claim")
    })

    it("rejects an invalid request body that violates schema", async () => {
      const res = await app.request("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: 12345 }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe("GET /ping", () => {
    it("returns pong with timestamp", async () => {
      const res = await app.request("/ping")
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(typeof json.data.pong).toBe("string")
    })
  })

  describe("GET /.well-known/did.json", () => {
    it("returns the verifier DID document", async () => {
      const res = await app.request("/.well-known/did.json")
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.id).toBe("did:web:verifier.example.com")
      expect(json.verificationMethod).toBeDefined()
    })
  })
})
