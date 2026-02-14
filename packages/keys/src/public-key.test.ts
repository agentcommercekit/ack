import { describe, expect, test } from "vitest"
import { isBase58 } from "./encoding/base58"
import { base64urlToBytes, isBase64url } from "./encoding/base64"
import { isHexString } from "./encoding/hex"
import {
  isPublicKeyJwkEd25519,
  isPublicKeyJwkSecp256k1,
  isPublicKeyJwkSecp256r1,
} from "./encoding/jwk"
import { isMultibase } from "./encoding/multibase"
import { keyCurves } from "./key-curves"
import { generateKeypair } from "./keypair"
import {
  encodePublicKeyFromKeypair,
  isValidPublicKey,
  publicKeyEncodings,
} from "./public-key"

describe("public-key methods", () => {
  describe.each(keyCurves)("curve: %s", (curve) => {
    describe("isValidPublicKey()", () => {
      test("validates public keys correctly", async () => {
        const keypair = await generateKeypair(curve)
        expect(isValidPublicKey(keypair.publicKey, curve)).toBe(true)

        const tooShort = keypair.publicKey.slice(
          0,
          keypair.publicKey.length - 1,
        )
        expect(isValidPublicKey(tooShort, curve)).toBe(false)
      })
    })

    describe.each(publicKeyEncodings)("encoding: %s", (format) => {
      test("encodes public key correctly", async () => {
        const keypair = await generateKeypair(curve)
        const publicKey = encodePublicKeyFromKeypair(format, keypair)
        const publicKeyValue = publicKey.value

        switch (format) {
          case "hex":
            expect(isHexString(publicKeyValue)).toBe(true)
            break
          case "jwk":
            if (curve === "secp256k1" || curve === "secp256r1") {
              if (
                !isPublicKeyJwkSecp256k1(publicKeyValue) &&
                !isPublicKeyJwkSecp256r1(publicKeyValue)
              ) {
                throw new Error(
                  `Invalid JWK: ${JSON.stringify(publicKeyValue)}`,
                )
              }

              expect(publicKeyValue).toEqual({
                kty: "EC",
                crv: curve,
                x: expect.any(String) as unknown,
                y: expect.any(String) as unknown,
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
                x: expect.any(String) as unknown,
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
        if (curve === "secp256k1" || curve === "secp256r1") {
          expect(jwk.value).toEqual({
            kty: "EC",
            crv: curve,
            x: expect.any(String) as unknown,
            y: expect.any(String) as unknown,
          })
        } else {
          expect(jwk.value).toEqual({
            kty: "OKP",
            crv: "Ed25519",
            x: expect.any(String) as unknown,
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
