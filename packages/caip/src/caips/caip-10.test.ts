import { describe, expect, it } from "vitest"

import { caip10Parts, createCaip10AccountId } from "./index"

describe("createCaip10AccountId", () => {
  it("creates a caip 10 account ID for EVM address", () => {
    const result = createCaip10AccountId(
      "eip155:1",
      "0x1234567890123456789012345678901234567890",
    )
    expect(result).toBe("eip155:1:0x1234567890123456789012345678901234567890")
  })

  it("creates a caip 10 account ID for Solana address", () => {
    const result = createCaip10AccountId(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P",
    )
    expect(result).toBe(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P",
    )
  })

  it("throws for invalid chain ID", () => {
    expect(() =>
      createCaip10AccountId(
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally passing invalid input to exercise runtime validation
        "bad" as never,
        "0x1234567890123456789012345678901234567890",
      ),
    ).toThrow("Invalid CAIP-2 chain ID")
  })

  it("throws for invalid account address", () => {
    expect(() => createCaip10AccountId("eip155:1", "")).toThrow(
      "Invalid CAIP-10 account address",
    )
  })
})

describe("caip10Parts", () => {
  it("parses a valid EVM CAIP-10 account ID", () => {
    const result = caip10Parts(
      "eip155:1:0x1234567890123456789012345678901234567890",
    )
    expect(result).toEqual({
      namespace: "eip155",
      reference: "1",
      accountId: "0x1234567890123456789012345678901234567890",
    })
  })

  it("throws for an empty string", () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally passing invalid input to exercise runtime validation
    expect(() => caip10Parts("" as never)).toThrow(
      "Invalid CAIP-10 account ID",
    )
  })

  it("throws when the account address is missing", () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally passing invalid input to exercise runtime validation
    expect(() => caip10Parts("eip155:1" as never)).toThrow(
      "Invalid CAIP-10 account ID",
    )
  })

  it("throws for an account ID with an extra colon-delimited segment", () => {
    // Per the CAIP-10 spec, the account_address component cannot contain a
    // colon (caip10AccountAddressPattern is `[-.%a-zA-Z0-9]{1,128}`), so a
    // fourth colon-delimited segment makes the whole string invalid. A naive
    // `split(":")` + destructure silently drops the extra segment instead of
    // rejecting the malformed input.
    expect(() =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally passing invalid input to exercise runtime validation
      caip10Parts("eip155:1:0xabc:evil" as never),
    ).toThrow("Invalid CAIP-10 account ID")
  })
})
