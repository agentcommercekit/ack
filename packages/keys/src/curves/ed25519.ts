import { ed25519 } from "@noble/curves/ed25519"
import type { Keypair } from "../keypair"

/**
 * Generate a random private key using the Ed25519 curve
 */
function generatePrivateKeyBytes(): Promise<Uint8Array> {
  return Promise.resolve(ed25519.utils.randomPrivateKey())
}

/**
 * Generate a keypair
 */
export async function generateKeypair(
  privateKeyBytes?: Uint8Array
): Promise<Keypair> {
  privateKeyBytes ??= await generatePrivateKeyBytes()
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)

  return Promise.resolve({
    publicKey: publicKeyBytes,
    privateKey: privateKeyBytes,
    curve: "Ed25519"
  })
}
