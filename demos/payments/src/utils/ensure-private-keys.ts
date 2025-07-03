import { colors, log, updateEnvFile } from "@repo/cli-tools"
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
