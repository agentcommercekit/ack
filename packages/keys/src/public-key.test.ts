import { varint } from "multiformats"
import { describe, expect, test } from "vitest"

import { isBase58 } from "./encoding/base58"
import { base64urlToBytes, isBase64url } from "./encoding/base64"
import { isHexString } from "./encoding/hex"
import {
  isPublicKeyJwkEd25519,
  isPublicKeyJwkSecp256k1,
  isPublicKeyJwkSecp256r1,
} from "./encoding/jwk"
import { isMultibase, multibaseToBytes } from "./encoding/multibase"
import { keyCurveMulticodecs, keyCurves, type KeyCurve } from "./key-curves"
import { generateKeypair } from "./keypair"
import {
  encodePublicKeyFromKeypair,
  isValidPublicKey,
  publicKeyToMultikey,
} from "./public-key"

const ecCurves = ["secp256k1", "secp256r1"] as const satisfies KeyCurve[]

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

    test("encodes public key to hex", async () => {
      const keypair = await generateKeypair(curve)
      const publicKey = encodePublicKeyFromKeypair("hex", keypair)
      expect(isHexString(publicKey.value)).toBe(true)
    })

    test("encodes public key to multibase", async () => {
      const keypair = await generateKeypair(curve)
      const publicKey = encodePublicKeyFromKeypair("multibase", keypair)
      expect(isMultibase(publicKey.value)).toBe(true)
    })

    test("encodes public key as a Multikey", async () => {
      const keypair = await generateKeypair(curve)
      const value = publicKeyToMultikey(keypair.publicKey, curve)

      expect(encodePublicKeyFromKeypair("multibase", keypair).value).toBe(value)

      const bytes = multibaseToBytes(value)
      const [code, prefixLength] = varint.decode(bytes)

      // The multicodec code identifies the curve, so a reader can tell one
      // curve's key from another's
      expect(code).toBe(keyCurveMulticodecs[curve])

      // Ed25519 has a single 32-byte encoding; the EC curves use their
      // 33-byte compressed form, which is what their codes identify
      expect(bytes.length - prefixLength).toBe(curve === "Ed25519" ? 32 : 33)
    })

    test("throws when the bytes are not a public key on the curve", async () => {
      const keypair = await generateKeypair(curve)

      // The message asserts the rejection comes from the curve check, rather
      // than incidentally from decoding an EC point
      const message = `Invalid ${curve} public key`

      // Wrong length for every curve
      expect(() => publicKeyToMultikey(new Uint8Array(20), curve)).toThrow(
        message,
      )

      // Right length for the curve, but not a point on it
      const notOnCurve = new Uint8Array(keypair.publicKey.length).fill(0xff)
      expect(isValidPublicKey(notOnCurve, curve)).toBe(false)
      expect(() => publicKeyToMultikey(notOnCurve, curve)).toThrow(message)
    })

    test("encodes public key to base58", async () => {
      const keypair = await generateKeypair(curve)
      const publicKey = encodePublicKeyFromKeypair("base58", keypair)
      expect(isBase58(publicKey.value)).toBe(true)
    })
  })

  describe.each(ecCurves)("curve: %s jwk encoding", (curve) => {
    test("encodes public key to EC jwk", async () => {
      const keypair = await generateKeypair(curve)
      const jwk = encodePublicKeyFromKeypair("jwk", keypair).value

      const isValidEcJwk =
        isPublicKeyJwkSecp256k1(jwk) || isPublicKeyJwkSecp256r1(jwk)
      expect(isValidEcJwk).toBe(true)
      expect(jwk).toEqual({
        kty: "EC",
        crv: curve,
        x: expect.any(String),
        y: expect.any(String),
      })

      const ecJwk = ecJwkOrThrow(jwk)
      expect(isBase64url(ecJwk.x)).toBe(true)
      expect(isBase64url(ecJwk.y)).toBe(true)
      expect(base64urlToBytes(ecJwk.x).length).toBe(32)
      expect(base64urlToBytes(ecJwk.y).length).toBe(32)
    })
  })

  describe("curve: Ed25519 jwk encoding", () => {
    test("encodes public key to OKP jwk", async () => {
      const keypair = await generateKeypair("Ed25519")
      const jwk = encodePublicKeyFromKeypair("jwk", keypair).value

      expect(isPublicKeyJwkEd25519(jwk)).toBe(true)
      expect(jwk).toEqual({
        kty: "OKP",
        crv: "Ed25519",
        x: expect.any(String),
      })

      const okpJwk = okpJwkOrThrow(jwk)
      expect(isBase64url(okpJwk.x)).toBe(true)
      expect(base64urlToBytes(okpJwk.x).length).toBe(32)
    })
  })
})

function ecJwkOrThrow(jwk: unknown) {
  if (isPublicKeyJwkSecp256k1(jwk)) {
    return jwk
  }
  if (isPublicKeyJwkSecp256r1(jwk)) {
    return jwk
  }
  throw new Error("Expected an EC public key JWK")
}

function okpJwkOrThrow(jwk: unknown) {
  if (!isPublicKeyJwkEd25519(jwk)) {
    throw new Error("Expected an Ed25519 public key JWK")
  }
  return jwk
}
