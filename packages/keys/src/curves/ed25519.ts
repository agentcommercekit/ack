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
  privateKeyBytes = generatePrivateKeyBytes(),
): Promise<Keypair> {
  const publicKeyBytes = getPublicKeyBytes(privateKeyBytes)

  return Promise.resolve({
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    curve: "Ed25519",
  })
}

/**
 * Check if a public key is a valid ed25519 public key
 * @param pubkey - The public key bytes to check
 * @returns true if the public key is valid, false otherwise
 */
export function isValidPublicKey(pubkey: Uint8Array): boolean {
  if (pubkey.length !== 32) {
    return false
  }

  try {
    ed25519.ExtendedPoint.fromHex(pubkey)
    return true
  } catch {
    return false
  }
}
