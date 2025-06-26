import { describe, expect, test } from "vitest"
import { generateKeypair } from "./secp256r1"
import { hexStringToBytes } from "../encoding/hex"

describe("secp256r1", () => {
  describe("generateKeypair()", () => {
    test("generates valid Keypair", async () => {
      const keypair = await generateKeypair()

      expect(keypair).toBeDefined()
      expect(keypair.privateKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.algorithm).toBe("secp256r1")
    })

    test("generates a unique `Keypair`s", async () => {
      const keypair1 = await generateKeypair()
      const keypair2 = await generateKeypair()

      expect(keypair1.privateKey).not.toEqual(keypair2.privateKey)
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.algorithm).toBe("secp256r1")
      expect(keypair2.algorithm).toBe("secp256r1")
    })
  })

  test("generates a Keypair from valid private key", async () => {
    const privateKeyBytes = hexStringToBytes(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    )

    const keypair = await generateKeypair(privateKeyBytes)

    expect(keypair).toBeDefined()
    expect(keypair.privateKey).toEqual(privateKeyBytes)
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(keypair.algorithm).toBe("secp256r1")
  })

  test("throws an error for invalid private key format", async () => {
    const invalidPrivateKey = new Uint8Array([1, 2, 3]) // Too short for secp256r1
    await expect(generateKeypair(invalidPrivateKey)).rejects.toThrow()
  })
})
