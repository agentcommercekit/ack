import { errorMessage, successMessage } from "@repo/cli-tools"
import fs from "node:fs/promises"
import path from "node:path"

// Helper function to update .env file
export async function updateEnvFile(
  newValues: Record<string, string>,
  envPath: string,
) {
  try {
    let envContent = ""
    try {
      envContent = await fs.readFile(envPath, { encoding: "utf8" })
    } catch (error) {
      // .env file doesn't exist, will create it
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }

    const lines = envContent.split("\n")
    const updatedLines: string[] = []
    const keysToUpdate = new Set(Object.keys(newValues))

    for (const line of lines) {
      if (line.trim() === "" || line.startsWith("#")) {
        updatedLines.push(line)
        continue
      }
      const parts = line.split("=", 1)
      const key = parts[0]
      if (key && key in newValues) {
        updatedLines.push(`${key}=${newValues[key]}`)
        keysToUpdate.delete(key)
      } else {
        updatedLines.push(line)
      }
    }

    for (const key of keysToUpdate) {
      updatedLines.push(`${key}=${newValues[key]}`)
    }

    // Filter out potential multiple empty lines at the end
    let finalContent = updatedLines.join("\n")
    while (finalContent.endsWith("\n\n")) {
      finalContent = finalContent.slice(0, -1)
    }
    if (envContent.trim() === "" && finalContent.startsWith("\n")) {
      finalContent = finalContent.substring(1)
    }

    await fs.writeFile(envPath, finalContent)
    console.log(
      successMessage(
        `Successfully updated ${path.basename(envPath)} with new keys. ✨`,
      ),
    )
  } catch (error) {
    console.error(errorMessage(`Failed to update .env file: ${error}`))
  }
}
