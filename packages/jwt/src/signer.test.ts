import { generateKeypair } from "@agentcommercekit/keys"
import { describe, expect, test } from "vitest"

import { createJwtSigner } from "./signer"

describe("createJwtSigner", () => {
  test("creates a secp256k1 JWT signer", async () => {
    // Generate a secp256k1 key pair
    const keypair = await generateKeypair("secp256k1")
    expect(keypair.curve).toBe("secp256k1")

    // Create the JWT signer
    const signer = createJwtSigner(keypair)
    expect(typeof signer).toBe("function")

    // Sign some data
    const data = "test message"
    const signature = await signer(data)

    // Verify the signature format
    expect(signature).toBeDefined()
    expect(typeof signature).toBe("string")
    // JWT signatures are base64url encoded
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test("creates an Ed25519 JWT signer", async () => {
    // Generate an Ed25519 key pair
    const keypair = await generateKeypair("Ed25519")
    expect(keypair.curve).toBe("Ed25519")

    // Create the JWT signer
    const signer = createJwtSigner(keypair)
    expect(typeof signer).toBe("function")

    // Sign some data
    const data = "test message"
    const signature = await signer(data)

    // Verify the signature format
    expect(signature).toBeDefined()
    expect(typeof signature).toBe("string")
    // JWT signatures are base64url encoded
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test("same message produces same signature with same keypair", async () => {
    const keypair = await generateKeypair("secp256k1")
    const signer = createJwtSigner(keypair)
    const data = "test message"

    const signature1 = await signer(data)
    const signature2 = await signer(data)

    expect(signature1).toBe(signature2)
  })

  test("same message produces different signature with different keypair", async () => {
    const keypair1 = await generateKeypair("secp256k1")
    const keypair2 = await generateKeypair("secp256k1")
    const signer1 = createJwtSigner(keypair1)
    const signer2 = createJwtSigner(keypair2)
    const data = "test message"

    const signature1 = await signer1(data)
    const signature2 = await signer2(data)

    expect(signature1).not.toBe(signature2)
  })

  test("handles both string and Uint8Array input", async () => {
    const keypair = await generateKeypair("secp256k1")
    const signer = createJwtSigner(keypair)
    const message = "test message"
    const messageBytes = new TextEncoder().encode(message)

    const signature1 = await signer(message)
    const signature2 = await signer(messageBytes)

    expect(signature1).toBe(signature2)
  })
})
