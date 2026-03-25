import stripAnsi from "strip-ansi"
import { describe, expect, it } from "vitest"

import {
  demoFooter,
  demoHeader,
  errorMessage,
  link,
  sectionHeader,
  successMessage,
  wordWrap,
} from "./formatters"

describe("sectionHeader", () => {
  it("creates a header with dividers matching the message width", () => {
    const header = sectionHeader("Test Section")
    const plain = stripAnsi(header)

    const lines = plain.trim().split("\n")
    expect(lines).toHaveLength(3)
    // Divider length matches the message length
    expect(lines[0]!.length).toBe(lines[1]!.length)
  })

  it("includes a step number when provided", () => {
    const header = sectionHeader("Do the thing", { step: 3 })
    const plain = stripAnsi(header)

    expect(plain).toContain("Step 3:")
    expect(plain).toContain("Do the thing")
  })

  it("omits step prefix when no step is given", () => {
    const header = sectionHeader("No step here")
    const plain = stripAnsi(header)

    expect(plain).not.toContain("Step")
  })
})

describe("successMessage", () => {
  it("prefixes with a check mark", () => {
    const msg = stripAnsi(successMessage("it worked"))
    expect(msg).toBe("✓ it worked")
  })
})

describe("errorMessage", () => {
  it("prefixes with an X", () => {
    const msg = stripAnsi(errorMessage("it broke"))
    expect(msg).toBe("✗ it broke")
  })
})

describe("wordWrap", () => {
  it("wraps long text to the specified width", () => {
    const longText = "word ".repeat(30).trim()
    const wrapped = wordWrap(longText, 20)

    for (const line of wrapped.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(20)
    }
  })

  it("defaults to 80 characters", () => {
    const longText = "word ".repeat(50).trim()
    const wrapped = wordWrap(longText)

    for (const line of wrapped.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80)
    }
  })
})

describe("demoHeader", () => {
  it("returns a non-empty string", () => {
    const header = demoHeader("ACK")
    expect(header.length).toBeGreaterThan(0)
  })
})

describe("demoFooter", () => {
  it("returns a non-empty string", () => {
    const footer = demoFooter("Done")
    expect(footer.length).toBeGreaterThan(0)
  })
})

describe("link", () => {
  it("returns the URL with formatting applied", () => {
    const result = link("https://example.com")
    expect(stripAnsi(result)).toBe("https://example.com")
  })
})
