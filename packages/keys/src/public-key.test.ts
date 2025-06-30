import { describe, expect, test } from "vitest"
import { isBase58 } from "./encoding/base58"
import { base64urlToBytes, isBase64url } from "./encoding/base64"
import { isHexString } from "./encoding/hex"
import { isPublicKeyJwkEd25519, isPublicKeyJwkSecp256k1 } from "./encoding/jwk"
import { isMultibase } from "./encoding/multibase"
import { generateKeypair } from "./keypair"
import { encodePublicKeyFromKeypair, publicKeyEncodings } from "./public-key"

const keyCurves = ["secp256k1", "Ed25519"] as const

describe("public key encoding", () => {
  describe.each(keyCurves)("curve: %s", (curve) => {
    describe.each(publicKeyEncodings)("format: %s", (format) => {
      test("encodes public key correctly", async () => {
        const keypair = await generateKeypair(curve)
        const publicKey = encodePublicKeyFromKeypair(format, keypair)
        const publicKeyValue = publicKey.value

        switch (format) {
          case "hex":
            expect(isHexString(publicKeyValue)).toBe(true)
            break
          case "jwk":
            if (curve === "secp256k1") {
              if (!isPublicKeyJwkSecp256k1(publicKeyValue)) {
                throw new Error("Invalid JWK")
              }

              expect(publicKeyValue).toEqual({
                kty: "EC",
                crv: "secp256k1",
                x: expect.any(String) as unknown,
                y: expect.any(String) as unknown
              })
              expect(isBase64url(publicKeyValue.x)).toBe(true)
              expect(isBase64url(publicKeyValue.y)).toBe(true)
              const xBytes = base64urlToBytes(publicKeyValue.x)
              expect(xBytes.length).toBe(32)
              const yBytes = base64urlToBytes(publicKeyValue.y)
              expect(yBytes.length).toBe(32)
            } else {
              if (!isPublicKeyJwkEd25519(publicKeyValue)) {
                throw new Error("Invalid JWK")
              }

              expect(publicKeyValue).toEqual({
                kty: "OKP",
                crv: "Ed25519",
                x: expect.any(String) as unknown
              })
              expect(isBase64url(publicKeyValue.x)).toBe(true)
              const xBytes = base64urlToBytes(publicKeyValue.x)
              expect(xBytes.length).toBe(32)
            }
            break
          case "multibase":
            expect(isMultibase(publicKeyValue)).toBe(true)
            break
          case "base58":
            expect(isBase58(publicKeyValue)).toBe(true)
            break
        }
      })
    })
  })

  describe("individual format functions", () => {
    describe.each(keyCurves)("curve: %s", (curve) => {
      test("formats to multibase", async () => {
        const keypair = await generateKeypair(curve)
        const multibase = encodePublicKeyFromKeypair("multibase", keypair)
        expect(isMultibase(multibase.value)).toBe(true)
      })

      test("formats to JWK", async () => {
        const keypair = await generateKeypair(curve)
        const jwk = encodePublicKeyFromKeypair("jwk", keypair)
        if (curve === "secp256k1") {
          expect(jwk.value).toEqual({
            kty: "EC",
            crv: "secp256k1",
            x: expect.any(String) as unknown,
            y: expect.any(String) as unknown
          })
        } else {
          expect(jwk.value).toEqual({
            kty: "OKP",
            crv: "Ed25519",
            x: expect.any(String) as unknown
          })
        }
      })

      test("formats to hex", async () => {
        const keypair = await generateKeypair(curve)
        const hex = encodePublicKeyFromKeypair("hex", keypair)
        expect(isHexString(hex.value)).toBe(true)
      })

      test("formats to base58", async () => {
        const keypair = await generateKeypair(curve)
        const base58 = encodePublicKeyFromKeypair("base58", keypair)
        expect(isBase58(base58.value)).toBe(true)
      })
    })
  })
})
