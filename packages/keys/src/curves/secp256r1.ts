import { secp256r1 } from "@noble/curves/p256"
import type { Keypair } from "../keypair"

/**
 * Generate a random private key using the secp256r1 curve
 */
export function generatePrivateKeyBytes(): Uint8Array {
  return secp256r1.utils.randomPrivateKey()
}

/**
 * Get the public key from a private key
 */
export function getPublicKeyBytes(
  privateKeyBytes: Uint8Array,
  compressed = false
): Uint8Array {
  return secp256r1.getPublicKey(privateKeyBytes, compressed)
}

/**
 * Generate a keypair
 */
export async function generateKeypair(
  privateKeyBytes = generatePrivateKeyBytes()
): Promise<Keypair> {
  const publicKeyBytes = getPublicKeyBytes(privateKeyBytes, false)

  return Promise.resolve({
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    curve: "secp256r1"
  })
}
