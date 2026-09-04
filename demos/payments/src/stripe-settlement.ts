/**
 * Demo-only Stripe settlement tracking for the Payment Service callback.
 *
 * Production services should verify a signed Stripe webhook (or Events API
 * object) that matches the payment request and option before treating the
 * charge as settled. This tracker approximates that gate for the local demo:
 * a callback may only proceed after the matching payment URL was issued.
 */

export type PendingStripeSettlement = {
  paymentRequestId: string
  paymentOptionId: string
}

export type StripeSettlementTracker = {
  issue: (reference: string, settlement: PendingStripeSettlement) => void
  /**
   * One-time consume: validates the demo event id and that this payment
   * attempt was previously issued a payment URL.
   */
  consumeVerified: (
    reference: string,
    eventId: string,
    expected: PendingStripeSettlement,
  ) => { ok: true } | { ok: false; reason: string }
  release: (reference: string) => void
}

/** Stripe event ids look like `evt_...` in the Events API. */
export function isDemoStripeEventId(eventId: string): boolean {
  return /^evt_[A-Za-z0-9]+$/.test(eventId)
}

export function createStripeSettlementTracker(): StripeSettlementTracker {
  const pending = new Map<string, PendingStripeSettlement>()

  return {
    issue(reference, settlement) {
      pending.set(reference, settlement)
    },
    consumeVerified(reference, eventId, expected) {
      if (!isDemoStripeEventId(eventId)) {
        return { ok: false, reason: "Invalid Stripe event id" }
      }

      const issued = pending.get(reference)
      if (
        !issued ||
        issued.paymentRequestId !== expected.paymentRequestId ||
        issued.paymentOptionId !== expected.paymentOptionId
      ) {
        return {
          ok: false,
          reason: "No verified Stripe settlement for this payment attempt",
        }
      }

      pending.delete(reference)
      return { ok: true }
    },
    release(reference) {
      pending.delete(reference)
    },
  }
}

export const RECEIPT_FETCH_TIMEOUT_MS = 10_000

/**
 * `fetch` with an AbortController timeout so a hung Receipt Service cannot
 * hold a spend reservation until the rolling window expires.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = RECEIPT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}
