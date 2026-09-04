import { describe, expect, it } from "vitest"

import { createSpendLedger, spendReference } from "./spend-ledger"

describe("spendReference", () => {
  it("encodes request and option ids so colon-containing parts cannot collide", () => {
    expect(spendReference("a:b", "c")).not.toBe(spendReference("a", "b:c"))
  })
})

describe("createSpendLedger", () => {
  it("reserves within the window and reports spent", () => {
    const ledger = createSpendLedger()

    expect(
      ledger.reserve({
        reference: "r1",
        subject: "payer",
        currency: "USDC",
        amount: 100n,
        windowMs: 60_000,
        limit: 250n,
      }),
    ).toEqual({ status: "reserved", spent: 100n })

    expect(ledger.spentWithin("payer", "USDC", 60_000)).toBe(100n)
  })

  it("rejects when the window budget would be exceeded", () => {
    const ledger = createSpendLedger()

    ledger.reserve({
      reference: "r1",
      subject: "payer",
      currency: "USDC",
      amount: 200n,
      windowMs: 60_000,
      limit: 250n,
    })

    expect(
      ledger.reserve({
        reference: "r2",
        subject: "payer",
        currency: "USDC",
        amount: 100n,
        windowMs: 60_000,
        limit: 250n,
      }),
    ).toEqual({ status: "exceeded", spent: 200n, limit: 250n })
  })

  it("re-reserves the same reference without double-counting", () => {
    const ledger = createSpendLedger()
    const reservation = {
      reference: "same",
      subject: "payer",
      currency: "USDC",
      amount: 100n,
      windowMs: 60_000,
      limit: 250n,
    }

    expect(ledger.reserve(reservation)).toEqual({
      status: "reserved",
      spent: 100n,
    })
    expect(ledger.reserve(reservation)).toEqual({
      status: "reserved",
      spent: 100n,
    })
    expect(ledger.spentWithin("payer", "USDC", 60_000)).toBe(100n)
  })

  it("releases an unsettled reservation and ignores release after commit", () => {
    const ledger = createSpendLedger()

    ledger.reserve({
      reference: "to-release",
      subject: "payer",
      currency: "USDC",
      amount: 100n,
      windowMs: 60_000,
      limit: 250n,
    })
    ledger.release("to-release")
    expect(ledger.spentWithin("payer", "USDC", 60_000)).toBe(0n)

    ledger.reserve({
      reference: "to-commit",
      subject: "payer",
      currency: "USDC",
      amount: 100n,
      windowMs: 60_000,
      limit: 250n,
    })
    ledger.commit("to-commit")
    ledger.release("to-commit")
    expect(ledger.spentWithin("payer", "USDC", 60_000)).toBe(100n)
  })

  it("expires entries outside the rolling window", () => {
    let now = 1_000_000
    const ledger = createSpendLedger({ now: () => now })

    ledger.reserve({
      reference: "old",
      subject: "payer",
      currency: "USDC",
      amount: 200n,
      windowMs: 60_000,
      limit: 250n,
    })

    now += 60_001

    expect(
      ledger.reserve({
        reference: "new",
        subject: "payer",
        currency: "USDC",
        amount: 200n,
        windowMs: 60_000,
        limit: 250n,
      }),
    ).toEqual({ status: "reserved", spent: 200n })
  })

  it("isolates subjects and currencies", () => {
    const ledger = createSpendLedger()

    ledger.reserve({
      reference: "a",
      subject: "payer-a",
      currency: "USDC",
      amount: 200n,
      windowMs: 60_000,
      limit: 250n,
    })

    expect(
      ledger.reserve({
        reference: "b",
        subject: "payer-b",
        currency: "USDC",
        amount: 200n,
        windowMs: 60_000,
        limit: 250n,
      }).status,
    ).toBe("reserved")

    expect(
      ledger.reserve({
        reference: "c",
        subject: "payer-a",
        currency: "USD",
        amount: 200n,
        windowMs: 60_000,
        limit: 250n,
      }).status,
    ).toBe("reserved")
  })

  it("recordOverBudget keeps the spend even when the window is full", () => {
    const ledger = createSpendLedger()

    expect(
      ledger.reserve({
        reference: "first",
        subject: "payer",
        currency: "USDC",
        amount: 200n,
        windowMs: 60_000,
        limit: 250n,
      }).status,
    ).toBe("reserved")

    expect(
      ledger.reserve({
        reference: "second",
        subject: "payer",
        currency: "USDC",
        amount: 200n,
        windowMs: 60_000,
        limit: 250n,
      }).status,
    ).toBe("exceeded")

    ledger.recordOverBudget({
      reference: "second",
      subject: "payer",
      currency: "USDC",
      amount: 200n,
      windowMs: 60_000,
    })

    expect(ledger.spentWithin("payer", "USDC", 60_000)).toBe(400n)
  })
})
