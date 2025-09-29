import { colors, log, updateEnvFile } from "@repo/cli-tools"
import { envFilePath } from "@/constants"
import { generatePrivateKeyHex } from "./keypair-info"
import { Keypair } from "@solana/web3.js"

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
  const kp = Keypair.generate()
  const publicKey = kp.publicKey.toBase58()
  const secretKeyJson = JSON.stringify(Array.from(kp.secretKey))
  await updateEnvFile(
    { [pubEnv]: publicKey, [secretEnv]: secretKeyJson },
    envFilePath
  )
  return { publicKey, secretKeyJson }
}
