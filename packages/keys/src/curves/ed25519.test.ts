import { describe, expect, test } from "vitest"

import { base58ToBytes } from "../encoding/base58"
import { generateKeypair, isValidPublicKey } from "./ed25519"

describe("Ed25519", () => {
  describe("generateKeypair()", () => {
    test("generates a valid Keypair", async () => {
      const keypair = await generateKeypair()

      expect(keypair).toBeDefined()
      expect(keypair.privateKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.curve).toBe("Ed25519")
    })

    test("generates unique `Keypair`s", async () => {
      const keypair1 = await generateKeypair()
      const keypair2 = await generateKeypair()

      expect(keypair1.privateKey).not.toEqual(keypair2.privateKey)
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.curve).toBe("Ed25519")
      expect(keypair2.curve).toBe("Ed25519")
    })

    test("generates keypair from valid private key", async () => {
      // Using a Solana-like base58 private key
      const privateKeyBase58 = "4dmKkXNHJmR1XNXbQwJhUT8Vo3PjU1GcJmZkQFRW3aqb"
      const privateKeyBytes = base58ToBytes(privateKeyBase58)

      const keypair = await generateKeypair(privateKeyBytes)

      expect(keypair).toBeDefined()
      expect(keypair.privateKey).toEqual(privateKeyBytes)
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.curve).toBe("Ed25519")
    })

    test("throws error for invalid private key format", async () => {
      const invalidPrivateKey = new Uint8Array([1, 2, 3]) // Too short for Ed25519
      await expect(generateKeypair(invalidPrivateKey)).rejects.toThrow()
    })
  })

  describe("isValidPublicKey()", () => {
    test("validates ed25519 public keys correctly", async () => {
      const keypair = await generateKeypair()
      expect(isValidPublicKey(keypair.publicKey)).toBe(true)

      const invalid = keypair.publicKey.slice(0, keypair.publicKey.length - 1)
      expect(isValidPublicKey(invalid)).toBe(false)
    })
  })
})
