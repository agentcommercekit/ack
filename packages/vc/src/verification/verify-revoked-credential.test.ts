import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { BitBuffer } from "bit-buffers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCredential } from "../create-credential"
import { makeRevocable } from "../revocation/make-revocable"
import { createStatusListCredential } from "../revocation/status-list-credential"
import { signCredential } from "../signing/sign-credential"
import { CredentialRevokedError, RevocationCheckError } from "./errors"
import { parseJwtCredential } from "./parse-jwt-credential"
import { verifyParsedCredential } from "./verify-parsed-credential"

const statusListUrl = "https://issuer.example.com/status/1"

describe("revocation, end to end", () => {
  const mockFetch = vi.fn<typeof fetch>()
  beforeEach(() => vi.stubGlobal("fetch", mockFetch))
  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  async function setup(revoked: boolean) {
    const resolver = getDidResolver()
    const keypair = await generateKeypair("secp256k1")
    const did = createDidWebUri("https://issuer.example.com")
    resolver.addToCache(did, createDidDocumentFromKeypair({ did, keypair }))
    const signer = {
      did,
      signer: createJwtSigner(keypair),
      alg: "ES256K" as const,
    }

    const bits = new BitBuffer(1024)
    const list = createStatusListCredential({
      url: statusListUrl,
      encodedList: revoked ? bits.set(3).toBitstring() : bits.toBitstring(),
      issuer: did,
    })
    const servedList = {
      ...(await parseJwtCredential(
        await signCredential(list, signer),
        resolver,
      )),
      credentialSubject: list.credentialSubject,
    }

    const vc = makeRevocable(
      createCredential({
        id: "https://issuer.example.com/credentials/3",
        type: "TestCredential",
        issuer: did,
        subject: "did:web:subject.example.com",
        attestation: { test: "test" },
      }),
      { id: `${statusListUrl}#3`, statusListIndex: 3, statusListUrl },
    )
    const parsed = await parseJwtCredential(
      await signCredential(vc, signer),
      resolver,
    )

    return { resolver, parsed, servedList, did }
  }

  it("rejects a genuinely revoked credential", async () => {
    const { resolver, parsed, servedList, did } = await setup(true)
    mockFetch.mockResolvedValueOnce(Response.json(servedList))

    await expect(
      verifyParsedCredential(parsed, { resolver, trustedIssuers: [did] }),
    ).rejects.toThrow(CredentialRevokedError)
  })

  it("accepts an unrevoked credential", async () => {
    const { resolver, parsed, servedList, did } = await setup(false)
    mockFetch.mockResolvedValueOnce(Response.json(servedList))

    await expect(
      verifyParsedCredential(parsed, { resolver, trustedIssuers: [did] }),
    ).resolves.toBeDefined()
  })

  it("rejects a revoked credential when the status list is unreachable", async () => {
    const { resolver, parsed, did } = await setup(true)
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    await expect(
      verifyParsedCredential(parsed, { resolver, trustedIssuers: [did] }),
    ).rejects.toThrow(RevocationCheckError)
  })

  it("rejects a revoked credential when an unverifiable empty list is served", async () => {
    const { resolver, parsed, did } = await setup(true)
    const forged = createStatusListCredential({
      url: statusListUrl,
      encodedList: new BitBuffer(1024).toBitstring(),
      issuer: did,
    })
    mockFetch.mockResolvedValueOnce(
      Response.json({
        ...forged,
        proof: { type: "JwtProof2020", jwt: "forged.jwt.token" },
      }),
    )

    await expect(
      verifyParsedCredential(parsed, { resolver, trustedIssuers: [did] }),
    ).rejects.toThrow(RevocationCheckError)
  })
})
