import { describe, expect, test } from "vitest"
import { hexStringToBytes } from "./encoding/hex"
import { generateKeypair, jwkToKeypair, keypairToJwk } from "./keypair"

describe("generateKeypair()", () => {
  test("generates secp256k1 Keypair", async () => {
    const keypair = await generateKeypair("secp256k1")

    expect(keypair).toBeDefined()
    expect(keypair.privateKey).toBeInstanceOf(Uint8Array)
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(keypair.curve).toBe("secp256k1")
  })

  test("generates Ed25519 Keypair", async () => {
    const keypair = await generateKeypair("Ed25519")

    expect(keypair).toBeDefined()
    expect(keypair.privateKey).toBeInstanceOf(Uint8Array)
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(keypair.curve).toBe("Ed25519")
  })

  test("generates unique `Keypair`s for each algorithm", async () => {
    const secpKeypair1 = await generateKeypair("secp256k1")
    const secpKeypair2 = await generateKeypair("secp256k1")
    const edKeypair1 = await generateKeypair("Ed25519")
    const edKeypair2 = await generateKeypair("Ed25519")

    expect(secpKeypair1.privateKey).not.toEqual(secpKeypair2.privateKey)
    expect(secpKeypair1.publicKey).not.toEqual(secpKeypair2.publicKey)
    expect(edKeypair1.privateKey).not.toEqual(edKeypair2.privateKey)
    expect(edKeypair1.publicKey).not.toEqual(edKeypair2.publicKey)
  })

  test("generates a Keypair from valid private key for both algorithms", async () => {
    const privateKeyBytes = hexStringToBytes(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    )

    const secpKeypair = await generateKeypair("secp256k1", privateKeyBytes)
    const edKeypair = await generateKeypair("Ed25519", privateKeyBytes)

    expect(secpKeypair.privateKey).toEqual(privateKeyBytes)
    expect(secpKeypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(secpKeypair.curve).toBe("secp256k1")

    expect(edKeypair.privateKey).toEqual(privateKeyBytes)
    expect(edKeypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(edKeypair.curve).toBe("Ed25519")
  })

  test("throws an error for invalid private key format for both algorithms", async () => {
    const invalidPrivateKey = new Uint8Array([1, 2, 3])

    await expect(
      generateKeypair("secp256k1", invalidPrivateKey)
    ).rejects.toThrow()
    await expect(
      generateKeypair("Ed25519", invalidPrivateKey)
    ).rejects.toThrow()
  })
})

describe("keypairToJwk and jwkToKeypair", () => {
  test("converts secp256k1 keypair to JWK and back", async () => {
    const keypair = await generateKeypair("secp256k1")
    const jwk = keypairToJwk(keypair)

    expect(jwk.kty).toBe("EC")
    expect(jwk.crv).toBe("secp256k1")
    expect(jwk.x).toBeDefined()
    if (jwk.crv === "secp256k1") {
      expect(jwk.y).toBeDefined()
    }
    expect(jwk.d).toBeDefined()

    const reconstructedKeypair = jwkToKeypair(jwk)
    expect(reconstructedKeypair.curve).toBe("secp256k1")
    expect(reconstructedKeypair.publicKey).toEqual(keypair.publicKey)
    expect(reconstructedKeypair.privateKey).toEqual(keypair.privateKey)
  })

  test("converts Ed25519 keypair to JWK and back", async () => {
    const keypair = await generateKeypair("Ed25519")
    const jwk = keypairToJwk(keypair)

    expect(jwk.kty).toBe("OKP")
    expect(jwk.crv).toBe("Ed25519")
    expect(jwk.x).toBeDefined()
    expect(jwk.d).toBeDefined()

    const reconstructedKeypair = jwkToKeypair(jwk)
    expect(reconstructedKeypair.curve).toBe("Ed25519")
    expect(reconstructedKeypair.publicKey).toEqual(keypair.publicKey)
    expect(reconstructedKeypair.privateKey).toEqual(keypair.privateKey)
  })
})
