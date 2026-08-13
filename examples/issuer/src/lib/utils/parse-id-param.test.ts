import { describe, expect, it } from "vitest"

import { parseIdParam } from "./parse-id-param"

describe("parseIdParam", () => {
  it.each([
    ["0", 0],
    ["1", 1],
    // A leading zero names the same row, and the parsed number is what the
    // caller goes on to use, so the id it builds is the canonical one.
    ["01", 1],
    ["8192", 8192],
  ])("reads '%s' as %i", (value, expected) => {
    expect(parseIdParam(value)).toBe(expected)
  })

  it.each([
    "abc",
    "1abc",
    // `parseInt` reads these as 1: hexadecimal, exponent and decimal notation
    // all stop at the first character it cannot use.
    "0x1",
    "1e3",
    "1.9",
    "-1",
    " 1",
    "1 ",
    "",
    // Parses to `1e+21`, which is neither safe nor an integer.
    "999999999999999999999",
  ])("rejects '%s'", (value) => {
    expect(parseIdParam(value)).toBeUndefined()
  })
})
