import { secp256k1 } from "@noble/curves/secp256k1"
import type { Keypair } from "../keypair"

/**
 * Generate a random private key using the secp256k1 curve
 */
function generatePrivateKeyBytes(): Promise<Uint8Array> {
  return Promise.resolve(secp256k1.utils.randomPrivateKey())
}

/**
 * Convert an uncompressed public key to compressed format
 * @param publicKey - The uncompressed public key (65 bytes)
 * @returns The compressed public key (33 bytes)
 */
export function compressPublicKey(keypair: Keypair): Uint8Array {
  return secp256k1.getPublicKey(keypair.privateKey, true)
}

/**
 * Generate a keypair
 */
export async function generateKeypair(
  privateKeyBytes?: Uint8Array
): Promise<Keypair> {
  privateKeyBytes ??= await generatePrivateKeyBytes()
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, false)

  return Promise.resolve({
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    curve: "secp256k1"
  })
}
