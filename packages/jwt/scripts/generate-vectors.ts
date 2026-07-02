/**
 * Generate golden JWT test vectors for cross-platform interop testing.
 * Used by ack-swift to verify Swift JWT implementation matches TypeScript.
 *
 * Run: pnpm exec tsx scripts/generate-jwt-vectors.ts
 */

import { generateKeypair } from "@agentcommercekit/keys"
import { hexStringToBytes, bytesToHexString } from "@agentcommercekit/keys/encoding"
import { createJwtSigner, createJwt } from "@agentcommercekit/jwt"

async function main() {
  // Fixed private key for deterministic vectors
  const privateKeyHex = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
  const privateKeyBytes = hexStringToBytes(privateKeyHex)

  // --- secp256k1 vector ---
  const secp256k1Keypair = await generateKeypair("secp256k1", privateKeyBytes)
  const secp256k1Signer = createJwtSigner(secp256k1Keypair)

  const secp256k1Jwt = await createJwt(
    {
      iss: "did:key:test-issuer",
      sub: "did:key:test-subject",
      aud: "https://example.com",
      iat: 1700000000,
      exp: 1800000000,
    },
    { issuer: "did:key:test-issuer", signer: secp256k1Signer },
    { alg: "ES256K" },
  )

  console.log("=== secp256k1 / ES256K ===")
  console.log("privateKey:", privateKeyHex)
  console.log("publicKey:", bytesToHexString(secp256k1Keypair.publicKey))
  console.log("publicKeyLength:", secp256k1Keypair.publicKey.length)
  console.log("jwt:", secp256k1Jwt)
  console.log()

  // --- Ed25519 vector ---
  const ed25519Keypair = await generateKeypair("Ed25519", privateKeyBytes)
  const ed25519Signer = createJwtSigner(ed25519Keypair)

  const ed25519Jwt = await createJwt(
    {
      iss: "did:key:test-issuer",
      sub: "did:key:test-subject",
      aud: "https://example.com",
      iat: 1700000000,
      exp: 1800000000,
    },
    { issuer: "did:key:test-issuer", signer: ed25519Signer },
    { alg: "EdDSA" },
  )

  console.log("=== Ed25519 / EdDSA ===")
  console.log("privateKey:", privateKeyHex)
  console.log("publicKey:", bytesToHexString(ed25519Keypair.publicKey))
  console.log("publicKeyLength:", ed25519Keypair.publicKey.length)
  console.log("jwt:", ed25519Jwt)
  console.log()

  // --- Decode and show parts for debugging ---
  for (const [label, jwt] of [["secp256k1", secp256k1Jwt], ["Ed25519", ed25519Jwt]] as const) {
    const [headerB64, payloadB64, sigB64] = jwt.split(".")
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString())
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
    console.log(`=== ${label} decoded ===`)
    console.log("header:", JSON.stringify(header))
    console.log("payload:", JSON.stringify(payload))
    console.log("signatureB64:", sigB64)
    console.log()
  }
}

main().catch(console.error)
