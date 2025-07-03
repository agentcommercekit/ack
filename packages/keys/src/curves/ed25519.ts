import { ed25519 } from "@noble/curves/ed25519"
import type { Keypair } from "../keypair"

/**
 * Generate a random private key using the Ed25519 curve
 */
export function generatePrivateKeyBytes(): Uint8Array {
  return ed25519.utils.randomPrivateKey()
}

/**
 * Get the public key from a private key
 */
export function getPublicKeyBytes(privateKeyBytes: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(privateKeyBytes)
}

/**
 * Generate a keypair
 */
export async function generateKeypair(
  privateKeyBytes = generatePrivateKeyBytes()
): Promise<Keypair> {
  const publicKeyBytes = getPublicKeyBytes(privateKeyBytes)

  return Promise.resolve({
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    curve: "Ed25519"
  })
}
