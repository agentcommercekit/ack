import stripAnsi from "strip-ansi"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { log, logJson } from "./prompts"

// Capture console.log output
const logged: string[] = []
vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
  logged.push(args.map(String).join(" "))
})

describe("log", () => {
  beforeEach(() => {
    logged.length = 0
  })

  it("prints a message to the console", () => {
    log("hello")
    expect(logged.some((l) => stripAnsi(l).includes("hello"))).toBe(true)
  })

  it("wraps text by default", () => {
    const long = "word ".repeat(30).trim()
    log(long)

    // With wrapping, output should have multiple lines
    const output = logged.join("\n")
    expect(stripAnsi(output).split("\n").length).toBeGreaterThan(1)
  })

  it("skips wrapping when wrap is false", () => {
    const long = "word ".repeat(30).trim()
    log(long, { wrap: false })

    // Without wrapping, the full string appears on one line
    expect(logged.some((l) => stripAnsi(l) === long)).toBe(true)
  })

  it("accepts multiple messages", () => {
    log("first", "second", "third")

    const output = stripAnsi(logged.join(" "))
    expect(output).toContain("first")
    expect(output).toContain("second")
    expect(output).toContain("third")
  })

  it("respects custom width", () => {
    const long = "word ".repeat(30).trim()
    log(long, { width: 20 })

    // Each logged line should be within the custom width
    for (const entry of logged) {
      for (const line of stripAnsi(entry).split("\n")) {
        if (line.length > 0) {
          expect(line.length).toBeLessThanOrEqual(20)
        }
      }
    }
  })
})

describe("logJson", () => {
  beforeEach(() => {
    logged.length = 0
  })

  it("prints formatted JSON", () => {
    logJson({ key: "value" })

    const output = stripAnsi(logged.join("\n"))
    expect(output).toContain('"key"')
    expect(output).toContain('"value"')
  })
})
