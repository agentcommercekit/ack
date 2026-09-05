import { afterEach, describe, expect, it, vi } from "vitest"

import {
  RECEIPT_FETCH_TIMEOUT_MS,
  STRIPE_SETTLEMENT_TTL_MS,
  createStripeSettlementTracker,
  fetchWithTimeout,
  isDemoStripeEventId,
  signDemoStripeEvent,
  verifyDemoStripeSignature,
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

describe("demo Stripe webhook HMAC", () => {
  it("accepts a matching signature and rejects forgeries", () => {
    const reference = "req_1:stripe-usd"
    const eventId = "evt_abc"
    const signature = signDemoStripeEvent(eventId, reference)

    expect(verifyDemoStripeSignature(eventId, reference, signature)).toBe(true)
    expect(
      verifyDemoStripeSignature(eventId, reference, "deadbeef"),
    ).toBe(false)
    expect(
      verifyDemoStripeSignature(eventId, "other-ref", signature),
    ).toBe(false)
  })
})

describe("createStripeSettlementTracker", () => {
  const expected = {
    paymentRequestId: "req_1",
    paymentOptionId: "stripe-usd",
  }
  const reference = "req_1:stripe-usd"
  const eventId = "evt_abc"
  const signature = signDemoStripeEvent(eventId, reference)

  it("verifies only after a matching payment URL was issued", () => {
    const tracker = createStripeSettlementTracker()

    expect(
      tracker.verify(reference, eventId, signature, expected).ok,
    ).toBe(false)

    tracker.issue(reference, expected)
    expect(tracker.verify(reference, eventId, signature, expected)).toEqual({
      ok: true,
    })

    // Idempotent: the same verified event can retry before commit.
    expect(tracker.verify(reference, eventId, signature, expected)).toEqual({
      ok: true,
    })

    tracker.commit(reference)
    expect(
      tracker.verify(reference, eventId, signature, expected).ok,
    ).toBe(false)
  })

  it("rejects mismatched payment request or option", () => {
    const tracker = createStripeSettlementTracker()
    tracker.issue(reference, expected)

    expect(
      tracker.verify(reference, eventId, signature, {
        paymentRequestId: "req_other",
        paymentOptionId: "stripe-usd",
      }).ok,
    ).toBe(false)

    expect(
      tracker.verify(reference, eventId, signature, {
        paymentRequestId: "req_1",
        paymentOptionId: "other",
      }).ok,
    ).toBe(false)
  })

  it("rejects invalid event ids and unsigned events even when issued", () => {
    const tracker = createStripeSettlementTracker()
    tracker.issue(reference, expected)

    expect(tracker.verify(reference, "bad", signature, expected).ok).toBe(
      false,
    )
    expect(
      tracker.verify(reference, eventId, "forged-signature", expected).ok,
    ).toBe(false)
    // Still pending after a bad attempt — a valid callback can still succeed.
    expect(tracker.verify(reference, eventId, signature, expected)).toEqual({
      ok: true,
    })
  })

  it("rejects a different event after one has already been verified", () => {
    const tracker = createStripeSettlementTracker()
    tracker.issue(reference, expected)
    expect(tracker.verify(reference, eventId, signature, expected).ok).toBe(
      true,
    )

    const otherEvent = "evt_other"
    const otherSig = signDemoStripeEvent(otherEvent, reference)
    expect(
      tracker.verify(reference, otherEvent, otherSig, expected).ok,
    ).toBe(false)
  })

  it("release drops a pending settlement without verifying", () => {
    const tracker = createStripeSettlementTracker()
    tracker.issue(reference, expected)
    tracker.release(reference)
    expect(
      tracker.verify(reference, eventId, signature, expected).ok,
    ).toBe(false)
  })

  it("expires abandoned pending settlements after the TTL", () => {
    let now = 1_000_000
    const tracker = createStripeSettlementTracker({
      ttlMs: STRIPE_SETTLEMENT_TTL_MS,
      now: () => now,
    })

    tracker.issue(reference, expected)
    now += STRIPE_SETTLEMENT_TTL_MS + 1
    expect(
      tracker.verify(reference, eventId, signature, expected).ok,
    ).toBe(false)
  })
})

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("passes AbortSignal to fetch and buffers the body", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response('{"ok":true}', { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const response = await fetchWithTimeout("https://example.test/receipt", {
      method: "POST",
      body: "{}",
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual({ ok: true })
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

  it("aborts when the response body stalls past the deadline", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener("abort", () => {
              controller.error(
                new DOMException("The operation was aborted.", "AbortError"),
              )
            })
            // Never enqueue — body hangs until abort.
          },
        })
        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
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
