// utils.ts
import { createHash } from "crypto"

export async function sha256(input: string): Promise<string> {
  return createHash("sha256").update(input).digest("hex")
}