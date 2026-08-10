/**
 * A tiny in-memory spend ledger for the payments demo.
 *
 * The ledger records how much a subject (the party a Payment Service spends on
 * behalf of) has already put at risk inside a rolling time window, so policy
 * can enforce a cumulative budget instead of only a per-transaction cap. A
 * per-transaction cap on its own is trivially defeated by splitting one payment
 * into many smaller ones.
 *
 * This is a demo store, not a spend control. It lives in process memory, so it
 * resets on restart and is not shared between Payment Service instances. A
 * production budget needs durable storage and an atomic check-and-reserve
 * (a transactional `UPDATE ... WHERE` or a distributed lock) whenever more than
 * one instance can authorize payments.
 */

interface SpendLedgerEntry {
  subject: string
  currency: string
  /** Amount in the currency's smallest subunit. */
  amount: bigint
  /** Epoch milliseconds at which the amount was reserved. */
  at: number
  /** `true` once the payment this entry covers has actually settled. */
  committed: boolean
}

interface SpendReservation {
  /**
   * Stable identifier for a single payment attempt. Reserving the same
   * reference twice replaces the existing entry rather than adding a second
   * one, so the two-phase Stripe flow (payment URL, then callback) and any
   * retries never count one payment twice.
   */
  reference: string
  subject: string
  currency: string
  /** Amount in the currency's smallest subunit. */
  amount: bigint
  /** Length of the rolling window, in milliseconds. */
  windowMs: number
  /** Cumulative cap for this subject and currency across the window. */
  limit: bigint
}

type SpendReservationResult =
  | {
      status: "reserved"
      /** Window total for this subject and currency, including this reservation. */
      spent: bigint
    }
  | {
      status: "exceeded"
      /** Window total excluding the rejected reservation. */
      spent: bigint
      limit: bigint
    }

export interface SpendLedger {
  /**
   * Checks the rolling window and records the amount in a single synchronous
   * step. Callers must not check the window and reserve separately: the
   * enclosing request handler awaits before policy runs, so two concurrent
   * payments would both observe the pre-payment total and both pass.
   */
  reserve(reservation: SpendReservation): SpendReservationResult
  /** Marks a reservation as settled, so it can no longer be released. */
  commit(reference: string): void
  /** Drops an unsettled reservation, e.g. when execution failed. */
  release(reference: string): void
  /** Reserved and committed total for a subject and currency in the window. */
  spentWithin(subject: string, currency: string, windowMs: number): bigint
}

export interface SpendLedgerOptions {
  /** Clock override, for tests. */
  now?: () => number
}

/**
 * Creates an in-memory spend ledger.
 *
 * All calls are expected to share one window length (the one configured on the
 * policy). `reserve` discards entries that have aged out of the window it is
 * given, which is what bounds the ledger's memory.
 *
 * @param options - Optional clock override
 * @returns A `SpendLedger`
 */
export function createSpendLedger({
  now = () => Date.now(),
}: SpendLedgerOptions = {}): SpendLedger {
  const entries = new Map<string, SpendLedgerEntry>()

  function totalWithin(
    subject: string,
    currency: string,
    windowMs: number,
    excludeReference?: string,
  ): bigint {
    const cutoff = now() - windowMs
    let total = 0n

    for (const [reference, entry] of entries) {
      if (reference === excludeReference) {
        continue
      }
      if (entry.subject !== subject || entry.currency !== currency) {
        continue
      }
      if (entry.at <= cutoff) {
        continue
      }
      total += entry.amount
    }

    return total
  }

  return {
    reserve({ reference, subject, currency, amount, windowMs, limit }) {
      const cutoff = now() - windowMs
      for (const [key, entry] of entries) {
        if (entry.at <= cutoff) {
          entries.delete(key)
        }
      }

      // Exclude any earlier reservation under this reference, otherwise the
      // second phase of a single payment would be counted on top of its own
      // first phase and denied.
      const spent = totalWithin(subject, currency, windowMs, reference)

      if (spent + amount > limit) {
        return { status: "exceeded", spent, limit }
      }

      // Keep the original timestamp when re-reserving, so a payment ages out of
      // the window from its first attempt and cannot be held open indefinitely.
      const existing = entries.get(reference)

      entries.set(reference, {
        subject,
        currency,
        amount,
        at: existing?.at ?? now(),
        committed: existing?.committed ?? false,
      })

      return { status: "reserved", spent: spent + amount }
    },

    commit(reference) {
      const entry = entries.get(reference)
      if (entry) {
        entry.committed = true
      }
    },

    release(reference) {
      const entry = entries.get(reference)
      if (entry && !entry.committed) {
        entries.delete(reference)
      }
    },

    spentWithin(subject, currency, windowMs) {
      return totalWithin(subject, currency, windowMs)
    },
  }
}
