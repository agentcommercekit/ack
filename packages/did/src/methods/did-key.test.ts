import type { PrivateKeyJwk } from "@agentcommercekit/keys/encoding"

import { generateKeypair, jwkToKeypair } from "@agentcommercekit/keys"
import { describe, expect, it } from "vitest"

import type { DidUri } from "../did-uri"

import { getDidResolver } from "../did-resolvers/get-did-resolver"
import { createDidKeyUri, isDidKeyUri } from "./did-key"

const KNOWN_DID_KEYS: { did: DidUri; jwk: PrivateKeyJwk }[] = [
  {
    did: "did:key:zQ3shNCcRrVT3tm43o6JNjSjQaiBXvSb8kHtFhoNGR8eimFZs",
    jwk: {
      kty: "EC",
      crv: "secp256k1",
      x: "C70KP9BXCdKBTfjtkQA9xH7uzd7R8hYC6cSpE6CUpro",
      y: "2kmbH7YTM-RJ2G596UidxkB3SiG66gi9htsriop766g",
      d: "ca66hYvhFSAbm_5YsBTydV2R_hDal-ISv3trPNCFYWg",
    },
  },
  {
    did: "did:key:z6MknEES6VA14awWdV27ab5r1jtz3d6ct2wULmvU4YgE1wQ8",
    jwk: {
      kty: "OKP",
      crv: "Ed25519",
      x: "c4cfSJSiOFUJffpI06i5Q20X8qc8Vdcw5gCxvcZy9kU",
      d: "FIQVa6NvaYXJdRCoI-pNl_ScNKgf_jVjGZf7bHDxEBw",
    },
  },
]

describe("createDidKeyUri()", () => {
  it.each(KNOWN_DID_KEYS)(
    `generates a valid did:key from a $jwk.crv public key`,
    async ({ did, jwk }) => {
      const keypair = jwkToKeypair(jwk)
      const didKey = createDidKeyUri(keypair)

      expect(didKey).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/)
      expect(didKey).toBe(did)

      // Sanity check, resolve the did to ensure it's a valid did:key document
      const didResolver = getDidResolver()
      const resolvedDid = await didResolver.resolve(didKey)
      expect(resolvedDid.didDocument).toBeDefined()
      expect(resolvedDid.didDocument?.id).toBe(did)
    },
  )

  it("uses the compressed public key", async () => {
    const keypair = await generateKeypair("secp256k1")
    const didKey = createDidKeyUri(keypair)
    expect(didKey).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/)
  })
})

describe("isDidKeyUri", () => {
  it("returns true for valid did:key", () => {
    expect(isDidKeyUri("did:key:z123")).toBe(true)
  })

  it("returns false for invalid did:key", () => {
    expect(isDidKeyUri("invalid-did-key")).toBe(false)
  })
})
