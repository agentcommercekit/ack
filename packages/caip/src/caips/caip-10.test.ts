import { describe, expect, it } from "vitest"

import { createCaip10AccountId } from "./index"

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
        "bad" as any,
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
