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
  it("parses a valid EVM account ID", () => {
    const result = caip10Parts(
      "eip155:1:0x1234567890123456789012345678901234567890",
    )
    expect(result).toEqual({
      namespace: "eip155",
      reference: "1",
      accountId: "0x1234567890123456789012345678901234567890",
    })
  })

  it("parses a valid Solana account ID", () => {
    const result = caip10Parts(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P",
    )
    expect(result).toEqual({
      namespace: "solana",
      reference: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      accountId: "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P",
    })
  })

  it("throws for an account ID with a trailing extra colon segment", () => {
    // Regression test: a naive `split(":")` would silently drop everything
    // after the third colon and happily return a truncated
    // { namespace, reference, accountId } for this malformed input instead
    // of rejecting it.
    expect(() =>
      caip10Parts("eip155:1:0x1234567890123456789012345678901234567890:extra"),
    ).toThrow("Invalid CAIP-10 account ID")
  })

  it("throws for a string missing the account address", () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentionally passing invalid input to exercise runtime validation
    expect(() => caip10Parts("eip155:1" as never)).toThrow(
      "Invalid CAIP-10 account ID",
    )
  })
})
