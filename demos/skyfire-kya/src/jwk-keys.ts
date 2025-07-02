import { generateKeypair, publicKeyBytesToJwk } from "agentcommercekit"

/**
 * Generate a keypair and an associated JWKS
 *
 * @returns
 */
export async function generateJwks() {
  const keypair = await generateKeypair("secp256r1")
  const publicKeyJwk = {
    ...publicKeyBytesToJwk(keypair.publicKey, "secp256r1"),
    crv: "P-256",
    use: "sig",
    kid: "skyfire-key-1",
    alg: "ES256"
  }

  return {
    jwks: { keys: [publicKeyJwk] },
    keypair
  }
}
