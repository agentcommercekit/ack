import { describe, expect, test } from "vitest"
import { isBase58 } from "./encoding/base58"
import { base64ToBytes, isBase64 } from "./encoding/base64"
import { isHexString } from "./encoding/hex"
import { isMultibase } from "./encoding/multibase"
import { generateKeypair } from "./keypair"
import {
  formatPublicKey,
  formatPublicKeyBase58,
  formatPublicKeyBase64,
  formatPublicKeyHex,
  formatPublicKeyJwk,
  formatPublicKeyMultibase,
  publicKeyFormats
} from "./public-key"
import type { PublicKeyJwkEd25519, PublicKeyJwkSecp256k1 } from "./encoding/jwk"

const keypairAlgorithms = ["secp256k1", "Ed25519"] as const

describe("public key encoding", () => {
  describe.each(keypairAlgorithms)("algorithm: %s", (algorithm) => {
    describe.each(publicKeyFormats)("format: %s", (format) => {
      test("formats public key correctly", async () => {
        const keypair = await generateKeypair(algorithm)
        const result = formatPublicKey(keypair, format)

        switch (format) {
          case "hex":
            expect(isHexString(result)).toBe(true)
            break
          case "jwk":
            if (algorithm === "secp256k1") {
              const jwk = result as PublicKeyJwkSecp256k1
              expect(jwk).toEqual({
                kty: "EC",
                crv: "secp256k1",
                x: expect.any(String) as unknown,
                y: expect.any(String) as unknown
              })
              expect(isBase64(jwk.x)).toBe(true)
              expect(isBase64(jwk.y)).toBe(true)
              const xBytes = base64ToBytes(jwk.x)
              expect(xBytes.length).toBe(32)
              const yBytes = base64ToBytes(jwk.y)
              expect(yBytes.length).toBe(32)
            } else {
              const jwk = result as PublicKeyJwkEd25519
              expect(jwk).toEqual({
                kty: "OKP",
                crv: "Ed25519",
                x: expect.any(String) as unknown
              })
              expect(isBase64(jwk.x)).toBe(true)
              const xBytes = base64ToBytes(jwk.x)
              expect(xBytes.length).toBe(32)
            }
            break
          case "multibase":
            expect(isMultibase(result)).toBe(true)
            break
          case "base58":
            expect(isBase58(result)).toBe(true)
            break
          case "base64":
            expect(isBase64(result)).toBe(true)
            break
        }
      })
    })
  })

  describe("individual format functions", () => {
    describe.each(keypairAlgorithms)("algorithm: %s", (algorithm) => {
      test("formats to multibase", async () => {
        const keypair = await generateKeypair(algorithm)
        const multibase = formatPublicKeyMultibase(keypair)
        expect(isMultibase(multibase)).toBe(true)
      })

      test("formats to JWK", async () => {
        const keypair = await generateKeypair(algorithm)
        const jwk = formatPublicKeyJwk(keypair)
        if (algorithm === "secp256k1") {
          expect(jwk).toEqual({
            kty: "EC",
            crv: "secp256k1",
            x: expect.any(String) as unknown,
            y: expect.any(String) as unknown
          })
        } else {
          expect(jwk).toEqual({
            kty: "OKP",
            crv: "Ed25519",
            x: expect.any(String) as unknown
          })
        }
      })

      test("formats to hex", async () => {
        const keypair = await generateKeypair(algorithm)
        const hex = formatPublicKeyHex(keypair)
        expect(isHexString(hex)).toBe(true)
      })

      test("formats to base58", async () => {
        const keypair = await generateKeypair(algorithm)
        const base58 = formatPublicKeyBase58(keypair)
        expect(isBase58(base58)).toBe(true)
      })

      test("formats to base64", async () => {
        const keypair = await generateKeypair(algorithm)
        const base64 = formatPublicKeyBase64(keypair)
        expect(isBase64(base64)).toBe(true)
      })
    })
  })
})
