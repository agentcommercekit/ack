/**
 * Demo-only Stripe settlement tracking for the Payment Service callback.
 *
 * Production services should verify a signed Stripe webhook (or Events API
 * object) that matches the payment request and option before treating the
 * charge as settled. This tracker approximates that gate for the local demo:
 * a callback may only proceed after the matching payment URL was issued and
 * the request carries an HMAC matching the demo webhook secret.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

/** Abandoned checkout TTL — mirrors a short-lived Stripe payment link. */
export const STRIPE_SETTLEMENT_TTL_MS = 30 * 60 * 1000

/**
 * Demo stand-in for Stripe's webhook signing secret (`whsec_...`).
 * Real services verify the `Stripe-Signature` header instead.
 */
export const DEMO_STRIPE_WEBHOOK_SECRET = "whsec_demo_ack_payments"

export type PendingStripeSettlement = {
  paymentRequestId: string
  paymentOptionId: string
}

type SettlementEntry = PendingStripeSettlement & {
  issuedAt: number
  /** Set once a signed Stripe-shaped event has been accepted. */
  verifiedEventId?: string
}

export type StripeSettlementTracker = {
  issue: (reference: string, settlement: PendingStripeSettlement) => void
  /**
   * Verify settlement without consuming it. Keeps state until `commit` so a
   * receipt-service failure can retry with the same Stripe event.
   */
  verify: (
    reference: string,
    eventId: string,
    signature: string,
    expected: PendingStripeSettlement,
  ) => { ok: true } | { ok: false; reason: string }
  /** One-time commit after receipt issuance succeeds. */
  commit: (reference: string) => void
  release: (reference: string) => void
}

/** Stripe event ids look like `evt_...` in the Events API. */
export function isDemoStripeEventId(eventId: string): boolean {
  return /^evt_[A-Za-z0-9]+$/.test(eventId)
}

/**
 * Demo HMAC over `eventId.reference`, analogous to Stripe webhook signing.
 */
export function signDemoStripeEvent(
  eventId: string,
  reference: string,
  secret = DEMO_STRIPE_WEBHOOK_SECRET,
): string {
  return createHmac("sha256", secret)
    .update(`${eventId}.${reference}`)
    .digest("hex")
}

export function verifyDemoStripeSignature(
  eventId: string,
  reference: string,
  signature: string,
  secret = DEMO_STRIPE_WEBHOOK_SECRET,
): boolean {
  if (!signature) {
    return false
  }
  const expected = signDemoStripeEvent(eventId, reference, secret)
  try {
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(signature, "utf8")
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function createStripeSettlementTracker(
  options: {
    ttlMs?: number
    now?: () => number
    webhookSecret?: string
  } = {},
): StripeSettlementTracker {
  const pending = new Map<string, SettlementEntry>()
  const ttlMs = options.ttlMs ?? STRIPE_SETTLEMENT_TTL_MS
  const now = options.now ?? Date.now
  const webhookSecret = options.webhookSecret ?? DEMO_STRIPE_WEBHOOK_SECRET

  function pruneExpired() {
    const cutoff = now() - ttlMs
    for (const [reference, entry] of pending) {
      if (entry.issuedAt < cutoff) {
        pending.delete(reference)
      }
    }
  }

  return {
    issue(reference, settlement) {
      pruneExpired()
      pending.set(reference, {
        ...settlement,
        issuedAt: now(),
      })
    },
    verify(reference, eventId, signature, expected) {
      pruneExpired()

      if (!isDemoStripeEventId(eventId)) {
        return { ok: false, reason: "Invalid Stripe event id" }
      }

      if (
        !verifyDemoStripeSignature(
          eventId,
          reference,
          signature,
          webhookSecret,
        )
      ) {
        return {
          ok: false,
          reason: "Stripe event signature verification failed",
        }
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

      // Idempotent retry: same verified event may re-enter after a receipt failure.
      if (issued.verifiedEventId && issued.verifiedEventId !== eventId) {
        return {
          ok: false,
          reason: "Settlement already verified with a different Stripe event",
        }
      }

      issued.verifiedEventId = eventId
      return { ok: true }
    },
    commit(reference) {
      pending.delete(reference)
    },
    release(reference) {
      pending.delete(reference)
    },
  }
}

export const RECEIPT_FETCH_TIMEOUT_MS = 10_000

/**
 * `fetch` with an AbortController timeout that stays armed through response
 * body consumption, so a stalled Receipt Service body cannot hold a spend
 * reservation until the rolling window expires.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = RECEIPT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    // Buffer the body under the same deadline before clearing the timer.
    const body = await response.arrayBuffer()
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } finally {
    clearTimeout(timeout)
  }
}
