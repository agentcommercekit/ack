import type { KeyCurve } from "./key-curves"

import * as ed25519 from "./curves/ed25519"
import * as secp256k1 from "./curves/secp256k1"
import * as secp256r1 from "./curves/secp256r1"
import { base64urlToBytes } from "./encoding/base64"
import {
  getPublicKeyJwk,
  privateKeyBytesToJwk,
  publicKeyJwkToBytes,
  type PrivateKeyJwk,
} from "./encoding/jwk"

export interface Keypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
  curve: KeyCurve
}

export function generatePrivateKeyBytes(curve: KeyCurve): Uint8Array {
  if (curve === "secp256k1") {
    return secp256k1.generatePrivateKeyBytes()
  }

  if (curve === "secp256r1") {
    return secp256r1.generatePrivateKeyBytes()
  }

  return ed25519.generatePrivateKeyBytes()
}

/**
 * Generate a Keypair for a given curve
 *
 * @param curve - The curve to use (`secp256k1` or `Ed25519`)
 * @param privateKeyBytes - The private key bytes to use (optional)
 * @returns A Keypair
 */
export async function generateKeypair(
  curve: KeyCurve,
  privateKeyBytes?: Uint8Array,
): Promise<Keypair> {
  if (curve === "secp256k1") {
    return secp256k1.generateKeypair(privateKeyBytes)
  }

  if (curve === "secp256r1") {
    return secp256r1.generateKeypair(privateKeyBytes)
  }

  return ed25519.generateKeypair(privateKeyBytes)
}

/**
 * Convert a Keypair to a JWK format
 *
 * @param keypair - The Keypair to convert
 * @returns A JSON Web Key representation of the Keypair
 */
export function keypairToJwk(keypair: Keypair): PrivateKeyJwk {
  return privateKeyBytesToJwk(keypair.privateKey, keypair.curve)
}

/**
 * Convert a JWK to a Keypair
 *
 * @param jwk - The JWK to convert
 * @returns A Keypair
 */
export function jwkToKeypair(jwk: PrivateKeyJwk): Keypair {
  const publicKeyJwk = getPublicKeyJwk(jwk)

  return {
    publicKey: publicKeyJwkToBytes(publicKeyJwk),
    privateKey: base64urlToBytes(jwk.d),
    curve: jwk.crv,
  }
}
