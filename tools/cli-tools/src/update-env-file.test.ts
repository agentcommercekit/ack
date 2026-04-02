import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { updateEnvFile } from "./update-env-file"

let tmpDir: string
let envPath: string

beforeEach(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cli-tools-test-"))
  envPath = path.join(tmpDir, ".env")
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("updateEnvFile", () => {
  it("creates a new .env file when none exists", async () => {
    await updateEnvFile({ API_KEY: "abc123" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("API_KEY=abc123")
  })

  it("creates updated file with existing key replaced in-place", async () => {
    await fs.writeFile(envPath, "API_KEY=old\nOTHER=keep\n")

    await updateEnvFile({ API_KEY: "new" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("API_KEY=new")
    expect(content).toContain("OTHER=keep")
    expect(content).not.toContain("API_KEY=old")
  })

  it("creates entry for keys that don't exist yet", async () => {
    await fs.writeFile(envPath, "EXISTING=yes\n")

    await updateEnvFile({ NEW_KEY: "hello" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("EXISTING=yes")
    expect(content).toContain("NEW_KEY=hello")
  })

  it("creates updated file preserving comments and blank lines", async () => {
    await fs.writeFile(envPath, "# This is a comment\n\nAPI_KEY=old\n")

    await updateEnvFile({ API_KEY: "new" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("# This is a comment")
    expect(content).toContain("API_KEY=new")
  })

  it("creates entries for multiple keys at once", async () => {
    await updateEnvFile({ KEY_A: "a", KEY_B: "b", KEY_C: "c" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("KEY_A=a")
    expect(content).toContain("KEY_B=b")
    expect(content).toContain("KEY_C=c")
  })

  it("creates entry with values containing equals signs", async () => {
    await updateEnvFile({ URL: "https://example.com?a=1&b=2" }, envPath)

    const content = await fs.readFile(envPath, "utf8")
    expect(content).toContain("URL=https://example.com?a=1&b=2")
  })
})
