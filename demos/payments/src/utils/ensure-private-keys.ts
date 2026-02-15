import { colors, log, updateEnvFile } from "@repo/cli-tools"
import { bytesToBase58, generateKeypair } from "agentcommercekit"

import { envFilePath } from "@/constants"

import { generatePrivateKeyHex } from "./keypair-info"

export async function ensurePrivateKey(name: string): Promise<string> {
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
  secretEnv: string,
): Promise<{ publicKey: string; secretKeyJson: string }> {
  const existingPub = process.env[pubEnv]
  const existingSecret = process.env[secretEnv]
  if (existingPub && existingSecret) {
    return { publicKey: existingPub, secretKeyJson: existingSecret }
  }
  log(colors.dim(`Generating ${pubEnv}/${secretEnv}...`))

  const kp = await generateKeypair("Ed25519")

  // Solana expects a 64-byte secret key (32-byte private + 32-byte public)
  const secretKey64 = new Uint8Array(kp.privateKey.length + kp.publicKey.length)
  secretKey64.set(kp.privateKey, 0)
  secretKey64.set(kp.publicKey, kp.privateKey.length)
  const secretKeyJson = JSON.stringify(Array.from(secretKey64))

  const publicKey = bytesToBase58(kp.publicKey)

  await updateEnvFile(
    { [pubEnv]: publicKey, [secretEnv]: secretKeyJson },
    envFilePath,
  )
  return { publicKey, secretKeyJson }
}
