import { beforeEach, describe, expect, it } from "vitest"

import { createSpendLedger, type SpendLedger } from "./spend-ledger"

const WINDOW_MS = 60 * 60 * 1000
const SUBJECT = "did:example:payment-service"

let clock: number
let ledger: SpendLedger

function reserve(reference: string, amount: bigint, limit = 1_000n) {
  return ledger.reserve({
    reference,
    subject: SUBJECT,
    currency: "USDC",
    amount,
    windowMs: WINDOW_MS,
    limit,
  })
}

beforeEach(() => {
  clock = 1_000_000
  ledger = createSpendLedger({ now: () => clock })
})

describe("createSpendLedger", () => {
  it("reserves an amount within the limit", () => {
    expect(reserve("payment-1", 400n)).toEqual({
      status: "reserved",
      spent: 400n,
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(400n)
  })

  it("accumulates separate payments inside the window", () => {
    reserve("payment-1", 400n)

    expect(reserve("payment-2", 400n)).toEqual({
      status: "reserved",
      spent: 800n,
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(800n)
  })

  it("rejects a reservation that would exceed the limit", () => {
    reserve("payment-1", 800n)

    expect(reserve("payment-2", 400n)).toEqual({
      status: "exceeded",
      spent: 800n,
      limit: 1_000n,
    })
  })

  it("does not record an amount it rejected", () => {
    reserve("payment-1", 800n)
    reserve("payment-2", 400n)

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(800n)
  })

  it("allows a reservation that exactly reaches the limit", () => {
    reserve("payment-1", 600n)

    expect(reserve("payment-2", 400n)).toEqual({
      status: "reserved",
      spent: 1_000n,
    })
  })

  it("counts a re-reserved reference once", () => {
    reserve("payment-1", 600n)

    expect(reserve("payment-1", 600n)).toEqual({
      status: "reserved",
      spent: 600n,
    })
    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(600n)
  })

  it("tracks each subject separately", () => {
    reserve("payment-1", 800n)

    const other = ledger.reserve({
      reference: "payment-2",
      subject: "did:example:other-payer",
      currency: "USDC",
      amount: 800n,
      windowMs: WINDOW_MS,
      limit: 1_000n,
    })

    expect(other).toEqual({ status: "reserved", spent: 800n })
  })

  it("tracks each currency separately", () => {
    reserve("payment-1", 800n)

    const other = ledger.reserve({
      reference: "payment-2",
      subject: SUBJECT,
      currency: "USD",
      amount: 800n,
      windowMs: WINDOW_MS,
      limit: 1_000n,
    })

    expect(other).toEqual({ status: "reserved", spent: 800n })
  })

  it("drops reservations that have aged out of the window", () => {
    reserve("payment-1", 800n)
    clock += WINDOW_MS

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
    expect(reserve("payment-2", 800n)).toEqual({
      status: "reserved",
      spent: 800n,
    })
  })

  it("keeps reservations that are still inside the window", () => {
    reserve("payment-1", 800n)
    clock += WINDOW_MS - 1

    expect(reserve("payment-2", 800n)).toEqual({
      status: "exceeded",
      spent: 800n,
      limit: 1_000n,
    })
  })

  it("ages a re-reserved payment out from its first attempt", () => {
    reserve("payment-1", 800n)
    clock += WINDOW_MS - 1
    reserve("payment-1", 800n)
    clock += 1

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
  })

  it("releases an unsettled reservation", () => {
    reserve("payment-1", 800n)
    ledger.release("payment-1")

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(0n)
  })

  it("keeps a committed reservation when release is called", () => {
    reserve("payment-1", 800n)
    ledger.commit("payment-1")
    ledger.release("payment-1")

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(800n)
  })

  it("ignores commit and release for an unknown reference", () => {
    reserve("payment-1", 800n)
    ledger.commit("payment-2")
    ledger.release("payment-2")

    expect(ledger.spentWithin(SUBJECT, "USDC", WINDOW_MS)).toBe(800n)
  })

  it("returns zero for a subject with no reservations", () => {
    expect(ledger.spentWithin("did:example:unknown", "USDC", WINDOW_MS)).toBe(
      0n,
    )
  })
})
