import { colors, log, updateEnvFile } from "@repo/cli-tools"
import { getAddressFromPublicKey } from "@solana/addresses"
import { envFilePath } from "@/constants"
import { generatePrivateKeyHex } from "./keypair-info"

export async function ensurePrivateKey(name: string) {
  const privateKeyHex = process.env[name]

  if (privateKeyHex) {
    return privateKeyHex
  }

  log(colors.dim(`Generating ${name}...`))
  const newPrivateKeyHex = generatePrivateKeyHex()
  await updateEnvFile({ [name]: newPrivateKeyHex }, envFilePath)
  return newPrivateKeyHex
}

export async function ensureSolanaKeys(
  pubEnv: string,
  secretEnv: string
): Promise<{ publicKey: string; secretKeyJson: string }> {
  const existingPub = process.env[pubEnv]
  const existingSecret = process.env[secretEnv]
  if (existingPub && existingSecret) {
    return { publicKey: existingPub, secretKeyJson: existingSecret }
  }
  log(colors.dim(`Generating ${pubEnv}/${secretEnv}...`))
  const kp = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify"
  ])

  const privateKeyJwk = await crypto.subtle.exportKey("jwk", kp.privateKey)
  const privateKeyBase64 = privateKeyJwk.d
  if (!privateKeyBase64) throw new Error("Failed to get private key bytes")

  const privateKeyBytes = new Uint8Array(
    Buffer.from(privateKeyBase64, "base64")
  )
  // Export raw 32-byte public key from SPKI (last 32 bytes of the DER-encoded key)
  const publicKeySpki = await crypto.subtle.exportKey("spki", kp.publicKey)
  const publicKeyBytes = new Uint8Array(publicKeySpki).slice(-32)
  // Concatenate 32-byte private key + 32-byte public key => 64-byte secret key
  const secretKey64 = new Uint8Array(
    privateKeyBytes.length + publicKeyBytes.length
  )
  secretKey64.set(privateKeyBytes, 0)
  secretKey64.set(publicKeyBytes, privateKeyBytes.length)
  const secretKeyJson = JSON.stringify(Array.from(secretKey64))

  const publicKey = await getAddressFromPublicKey(kp.publicKey)

  await updateEnvFile(
    { [pubEnv]: publicKey, [secretEnv]: secretKeyJson },
    envFilePath
  )
  return { publicKey, secretKeyJson }
}
