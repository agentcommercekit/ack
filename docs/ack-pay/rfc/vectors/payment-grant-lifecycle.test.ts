import { describe, expect, it } from "vitest"

// Ordering examples, not an ACK verifier or a settlement implementation.
// Inputs stand for the results of fresh request/grant and payment validation.
type Grant = { iss: string; jti: string }
type Attempt = {
  grant: Grant
  authorized: boolean
  payment: "absent" | "invalid" | "valid"
  execute?: () => Promise<void>
}

function createMerchant() {
  const records = new Map<string, "started" | "completed" | "unknown">()
  let started = 0

  async function handle(attempt: Attempt) {
    if (!attempt.authorized) {
      return "unauthorized"
    }
    if (attempt.payment === "absent") {
      return "challenge"
    }
    if (attempt.payment === "invalid") {
      return "invalid-payment"
    }

    // The identity comes from the validated grant, not the payment payload.
    const key = JSON.stringify([attempt.grant.iss, attempt.grant.jti])
    // Synchronous claim-before-await is atomic only within this model.
    // Real adapters need a durable atomic store shared by all RP replicas.
    if (records.has(key)) {
      return "already-claimed"
    }
    records.set(key, "started")
    started++
    try {
      await attempt.execute?.()
      records.set(key, "completed")
      return "completed"
    } catch {
      records.set(key, "unknown")
      return "unknown"
    }
  }

  return { handle, started: () => started }
}

const grant = { iss: "did:web:owner.example", jti: "purchase-1" }
const unpaid: Attempt = { grant, authorized: true, payment: "absent" }
const paid: Attempt = { grant, authorized: true, payment: "valid" }

describe("single-use payment grant lifecycle", () => {
  it("preserves a checked grant through the challenge and paid retry", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle(unpaid)).toBe("challenge")
    expect(merchant.started()).toBe(0)
    expect(await merchant.handle(paid)).toBe("completed")
    expect(merchant.started()).toBe(1)
  })

  it("preserves the grant through repeated challenge-only requests", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle(unpaid)).toBe("challenge")
    expect(await merchant.handle(unpaid)).toBe("challenge")
    expect(await merchant.handle(paid)).toBe("completed")
    expect(merchant.started()).toBe(1)
  })

  it("rejects an unauthorized attempt before redeeming the grant", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle({ ...paid, authorized: false })).toBe(
      "unauthorized",
    )
    expect(merchant.started()).toBe(0)
    expect(await merchant.handle(paid)).toBe("completed")
  })

  it("rejects invalid payment evidence before redeeming the grant", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle({ ...paid, payment: "invalid" })).toBe(
      "invalid-payment",
    )
    expect(merchant.started()).toBe(0)
    expect(await merchant.handle(paid)).toBe("completed")
  })

  it("uses the paid retry's current authorization result", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle(unpaid)).toBe("challenge")
    // For example, the grant expired or was revoked after the challenge.
    expect(await merchant.handle({ ...paid, authorized: false })).toBe(
      "unauthorized",
    )
    expect(merchant.started()).toBe(0)
  })

  it("allows only one concurrent paid request to begin execution", async () => {
    const merchant = createMerchant()
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const first = merchant.handle({ ...paid, execute: () => pending })
    try {
      expect(await merchant.handle(paid)).toBe("already-claimed")
      expect(merchant.started()).toBe(1)
    } finally {
      release()
    }
    expect(await first).toBe("completed")
  })

  it("keeps the claim when a submitted operation has an uncertain outcome", async () => {
    const merchant = createMerchant()
    expect(
      await merchant.handle({
        ...paid,
        execute: () => Promise.reject(new Error("settlement timed out")),
      }),
    ).toBe("unknown")
    expect(await merchant.handle(paid)).toBe("already-claimed")
    expect(merchant.started()).toBe(1)
  })

  it("rejects another paid operation after completion", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle(paid)).toBe("completed")
    expect(await merchant.handle(paid)).toBe("already-claimed")
    expect(merchant.started()).toBe(1)
  })

  it("keeps grants with the same jti from different issuers independent", async () => {
    const merchant = createMerchant()
    expect(await merchant.handle(paid)).toBe("completed")
    expect(
      await merchant.handle({
        ...paid,
        grant: { ...grant, iss: "did:web:another-owner.example" },
      }),
    ).toBe("completed")
    expect(merchant.started()).toBe(2)
  })
})
