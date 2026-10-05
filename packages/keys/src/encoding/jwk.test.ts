import { describe, expect, test } from "vitest"

import { bytesToBase64url, isBase64url } from "./base64"
import {
  isJwk,
  isPrivateKeyJwk,
  isPublicKeyJwk,
  isPublicKeyJwkEd25519,
  isPublicKeyJwkSecp256k1,
  isPublicKeyJwkSecp256r1,
  publicKeyBytesToJwk,
  publicKeyJwkToBytes,
  type PublicKeyJwkEd25519,
  type PublicKeyJwkSecp256k1,
} from "./jwk"

describe("JWK encoding", () => {
  // Test data: 32 bytes for Ed25519, 65 bytes for secp256k1
  const Ed25519Bytes = new Uint8Array(32).fill(1)
  const secp256k1Bytes = new Uint8Array(65)
  secp256k1Bytes[0] = 0x04 // prefix
  secp256k1Bytes.fill(1, 1, 33) // x-coordinate (32 bytes)
  secp256k1Bytes.fill(2, 33) // y-coordinate (32 bytes)

  // Generate the actual base64url encoded strings from our test data
  const base64String = bytesToBase64url(Ed25519Bytes) // base64url of 32 bytes of 1s
  const base64String2 = bytesToBase64url(secp256k1Bytes.slice(33)) // base64url of 32 bytes of 2s

  describe("publicKeyBytesToJwk", () => {
    test("converts Ed25519 public key to JWK", () => {
      const jwk = publicKeyBytesToJwk(Ed25519Bytes, "Ed25519")
      if (!isPublicKeyJwkEd25519(jwk)) {
        throw new Error("Expected Ed25519 public key JWK")
      }
      expect(jwk).toEqual({
        kty: "OKP",
        crv: "Ed25519",
        x: expect.any(String) as unknown,
      })
      expect(isBase64url(jwk.x)).toBe(true)
    })

    test("converts secp256k1 public key to JWK", () => {
      const jwk = publicKeyBytesToJwk(secp256k1Bytes, "secp256k1")
      if (!isPublicKeyJwkSecp256k1(jwk)) {
        throw new Error("Expected secp256k1 public key JWK")
      }
      expect(jwk).toEqual({
        kty: "EC",
        crv: "secp256k1",
        x: expect.any(String) as unknown,
        y: expect.any(String) as unknown,
      })
      expect(isBase64url(jwk.x)).toBe(true)
      expect(isBase64url(jwk.y)).toBe(true)
    })
  })

  describe("publicKeyJwkToBytes", () => {
    test("converts Ed25519 JWK to bytes", () => {
      const jwk: PublicKeyJwkEd25519 = {
        kty: "OKP",
        crv: "Ed25519",
        x: base64String,
      }
      const bytes = publicKeyJwkToBytes(jwk)
      expect(bytes).toEqual(Ed25519Bytes)
    })

    test("converts secp256k1 JWK to bytes", () => {
      const jwk: PublicKeyJwkSecp256k1 = {
        kty: "EC",
        crv: "secp256k1",
        x: base64String,
        y: base64String2,
      }
      const bytes = publicKeyJwkToBytes(jwk)
      expect(bytes).toEqual(secp256k1Bytes)
    })
  })

  describe("isPublicKeyJwk", () => {
    test("validates correct JWK", () => {
      const jwk: PublicKeyJwkEd25519 = {
        kty: "OKP",
        crv: "Ed25519",
        x: base64String,
      }
      expect(isPublicKeyJwk(jwk)).toBe(true)
    })

    test("rejects invalid kty", () => {
      const invalid = {
        kty: "RSA",
        crv: "Ed25519",
        x: base64String,
      } as const
      expect(isPublicKeyJwk(invalid)).toBe(false)
    })

    test("rejects invalid crv", () => {
      const invalid = {
        kty: "OKP",
        crv: "P-256",
        x: base64String,
      } as const
      expect(isPublicKeyJwk(invalid)).toBe(false)
    })

    test("rejects invalid x", () => {
      const invalid = {
        kty: "OKP",
        crv: "Ed25519",
        x: "",
      } as const
      expect(isPublicKeyJwk(invalid)).toBe(false)
    })

    test("rejects secp256k1 without y", () => {
      const invalid = {
        kty: "EC",
        crv: "secp256k1",
        x: base64String,
      } as const
      expect(isPublicKeyJwk(invalid)).toBe(false)
    })

    test("rejects Ed25519 with y", () => {
      const invalid = {
        kty: "OKP",
        crv: "Ed25519",
        x: base64String,
        y: base64String,
      } as const
      expect(isPublicKeyJwk(invalid)).toBe(false)
    })

    test("rejects non-objects", () => {
      expect(isPublicKeyJwk(null)).toBe(false)
      expect(isPublicKeyJwk(undefined)).toBe(false)
      expect(isPublicKeyJwk("not a jwk")).toBe(false)
      expect(isPublicKeyJwk(123)).toBe(false)
    })
  })

  describe("private key JWK validation", () => {
    test("validates secp256k1 private key JWK", () => {
      const validJwk = {
        kty: "EC" as const,
        crv: "secp256k1" as const,
        x: "base64x",
        y: "base64y",
        d: "base64d",
      }
      expect(isPrivateKeyJwk(validJwk)).toBe(true)
    })

    test("validates Ed25519 private key JWK", () => {
      const validJwk = {
        kty: "OKP" as const,
        crv: "Ed25519" as const,
        x: "base64x",
        d: "base64d",
      }
      expect(isPrivateKeyJwk(validJwk)).toBe(true)
    })

    test("rejects invalid private key JWK", () => {
      const invalidJwk = {
        kty: "EC" as const,
        crv: "secp256k1" as const,
        x: "base64x",
        y: "base64y",
        // missing d
      }
      expect(isPrivateKeyJwk(invalidJwk)).toBe(false)
    })

    test("rejects private key JWKs with invalid d values", () => {
      const baseJwk = {
        kty: "OKP" as const,
        crv: "Ed25519" as const,
        x: "base64x",
      }
      const secp256k1Jwk = {
        kty: "EC" as const,
        crv: "secp256k1" as const,
        x: "base64x",
        y: "base64y",
      }

      expect(isPrivateKeyJwk({ ...baseJwk, d: 1 })).toBe(false)
      expect(isPrivateKeyJwk({ ...baseJwk, d: "" })).toBe(false)
      expect(isJwk({ ...baseJwk, d: 1 })).toBe(false)
      expect(isJwk({ ...baseJwk, d: "" })).toBe(false)
      expect(isPrivateKeyJwk({ ...secp256k1Jwk, d: 1 })).toBe(false)
      expect(isPrivateKeyJwk({ ...secp256k1Jwk, d: "" })).toBe(false)
      expect(isJwk({ ...secp256k1Jwk, d: 1 })).toBe(false)
      expect(isJwk({ ...secp256k1Jwk, d: "" })).toBe(false)
    })
  })

  describe("roundtrip", () => {
    test("roundtrips Ed25519 public key through JWK", () => {
      const jwk = publicKeyBytesToJwk(Ed25519Bytes, "Ed25519")
      const bytes = publicKeyJwkToBytes(jwk)
      expect(bytes).toEqual(Ed25519Bytes)
    })

    test("roundtrips secp256k1 public key through JWK", () => {
      const jwk = publicKeyBytesToJwk(secp256k1Bytes, "secp256k1")
      const bytes = publicKeyJwkToBytes(jwk)
      expect(bytes).toEqual(secp256k1Bytes)
    })
  })

  describe("secp256r1", () => {
    // The P-256 public key from RFC 7515, Appendix A.3.1
    const rfc7515PublicKeyJwk = {
      kty: "EC",
      crv: "P-256",
      x: "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
      y: "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0",
    } as const

    // RFC 7518, Section 6.2.1.1 registers the curve as "P-256"
    test("names the curve P-256", () => {
      const bytes = publicKeyJwkToBytes(rfc7515PublicKeyJwk)
      expect(publicKeyBytesToJwk(bytes, "secp256r1")).toEqual(
        rfc7515PublicKeyJwk,
      )
    })

    test("accepts a P-256 public key JWK", () => {
      expect(isPublicKeyJwk(rfc7515PublicKeyJwk)).toBe(true)
      expect(isPublicKeyJwkSecp256r1(rfc7515PublicKeyJwk)).toBe(true)
    })

    test("rejects the curve name secp256r1, which JOSE does not register", () => {
      expect(isPublicKeyJwk({ ...rfc7515PublicKeyJwk, crv: "secp256r1" })).toBe(
        false,
      )
    })
  })
})
