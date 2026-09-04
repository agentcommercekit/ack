import { afterEach, describe, expect, it, vi } from "vitest"

import {
  RECEIPT_FETCH_TIMEOUT_MS,
  createStripeSettlementTracker,
  fetchWithTimeout,
  isDemoStripeEventId,
} from "./stripe-settlement"

describe("isDemoStripeEventId", () => {
  it("accepts Stripe-shaped event ids", () => {
    expect(isDemoStripeEventId("evt_1Abc")).toBe(true)
    expect(isDemoStripeEventId("evt_abc123XYZ")).toBe(true)
  })

  it("rejects empty or non-Stripe ids", () => {
    expect(isDemoStripeEventId("")).toBe(false)
    expect(isDemoStripeEventId("evt_")).toBe(false)
    expect(isDemoStripeEventId("evt_abc-def")).toBe(false)
    expect(isDemoStripeEventId("pi_123")).toBe(false)
    expect(isDemoStripeEventId("forged")).toBe(false)
  })
})

describe("createStripeSettlementTracker", () => {
  const expected = {
    paymentRequestId: "req_1",
    paymentOptionId: "stripe-usd",
  }

  it("verifies only after a matching payment URL was issued", () => {
    const tracker = createStripeSettlementTracker()
    const reference = "req_1:stripe-usd"

    expect(
      tracker.consumeVerified(reference, "evt_abc", expected).ok,
    ).toBe(false)

    tracker.issue(reference, expected)
    expect(
      tracker.consumeVerified(reference, "evt_abc", expected),
    ).toEqual({ ok: true })

    // One-time: a second callback cannot reuse the same settlement.
    expect(
      tracker.consumeVerified(reference, "evt_abc", expected).ok,
    ).toBe(false)
  })

  it("rejects mismatched payment request or option", () => {
    const tracker = createStripeSettlementTracker()
    const reference = "req_1:stripe-usd"
    tracker.issue(reference, expected)

    expect(
      tracker.consumeVerified(reference, "evt_abc", {
        paymentRequestId: "req_other",
        paymentOptionId: "stripe-usd",
      }).ok,
    ).toBe(false)

    expect(
      tracker.consumeVerified(reference, "evt_abc", {
        paymentRequestId: "req_1",
        paymentOptionId: "other",
      }).ok,
    ).toBe(false)
  })

  it("rejects invalid event ids even when issued", () => {
    const tracker = createStripeSettlementTracker()
    const reference = "req_1:stripe-usd"
    tracker.issue(reference, expected)

    expect(tracker.consumeVerified(reference, "bad", expected).ok).toBe(false)
    // Still pending after a bad event id — a valid callback can still succeed.
    expect(
      tracker.consumeVerified(reference, "evt_ok", expected),
    ).toEqual({ ok: true })
  })

  it("release drops a pending settlement without verifying", () => {
    const tracker = createStripeSettlementTracker()
    const reference = "req_1:stripe-usd"
    tracker.issue(reference, expected)
    tracker.release(reference)
    expect(
      tracker.consumeVerified(reference, "evt_abc", expected).ok,
    ).toBe(false)
  })
})

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("passes AbortSignal to fetch", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response("{}", { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)

    await fetchWithTimeout("https://example.test/receipt", {
      method: "POST",
      body: "{}",
    })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("aborts when the request exceeds the timeout", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        })
      }),
    )

    const pending = fetchWithTimeout(
      "https://example.test/receipt",
      { method: "POST" },
      RECEIPT_FETCH_TIMEOUT_MS,
    )

    const expectation = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    })
    await vi.advanceTimersByTimeAsync(RECEIPT_FETCH_TIMEOUT_MS)
    await expectation
  })
})
