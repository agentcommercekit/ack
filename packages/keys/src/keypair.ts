import { generateKeypair as ed25519 } from "./curves/ed25519"
import { generateKeypair as secp256k1 } from "./curves/secp256k1"
import { generateKeypair as secp256r1 } from "./curves/secp256r1"
import { base64urlToBytes, bytesToBase64url } from "./encoding/base64"
import { bytesToJwk, jwkToBytes } from "./encoding/jwk"
import type { PrivateKeyJwk } from "./encoding/jwk"
import type { Keypair, KeypairAlgorithm } from "./types"

/**
 * Generate a Keypair for a given algorithm
 *
 * @param algorithm - The algorithm to use (`secp256k1` or `Ed25519`)
 * @param privateKeyBytes - The private key bytes to use (optional)
 * @returns A Keypair
 */
export async function generateKeypair(
  algorithm: KeypairAlgorithm,
  privateKeyBytes?: Uint8Array
): Promise<Keypair> {
  if (algorithm === "secp256k1") {
    return secp256k1(privateKeyBytes)
  }

  if (algorithm === "secp256r1") {
    return secp256r1(privateKeyBytes)
  }

  return ed25519(privateKeyBytes)
}

/**
 * Convert a Keypair to a JWK format
 *
 * @param keypair - The Keypair to convert
 * @returns A JSON Web Key representation of the Keypair
 */
export function keypairToJwk(keypair: Keypair): PrivateKeyJwk {
  const publicKeyJwk = bytesToJwk(keypair.publicKey, keypair.algorithm)
  return {
    ...publicKeyJwk,
    d: bytesToBase64url(keypair.privateKey)
  }
}

/**
 * Convert a JWK to a Keypair
 *
 * @param jwk - The JWK to convert
 * @returns A Keypair
 */
export function jwkToKeypair(jwk: PrivateKeyJwk): Keypair {
  return {
    publicKey: jwkToBytes(jwk),
    privateKey: base64urlToBytes(jwk.d),
    algorithm: jwk.crv
  }
}
