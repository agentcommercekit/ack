import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { controllerClaimSchema as valibotControllerClaimSchema } from "./valibot"
import { controllerClaimSchema as zodControllerClaimSchema } from "./zod"

const validClaim = {
  id: "did:web:agent.example.com",
  controller: "did:web:controller.example.com",
}

describe("controllerClaimSchema", () => {
  it("accepts DID URIs for id and controller", () => {
    expect(v.safeParse(valibotControllerClaimSchema, validClaim).success).toBe(
      true,
    )
    expect(zodControllerClaimSchema.safeParse(validClaim).success).toBe(true)
  })

  it("rejects empty id and controller strings", () => {
    for (const input of [
      { ...validClaim, id: "" },
      { ...validClaim, controller: "" },
      { id: "", controller: "" },
    ]) {
      expect(v.safeParse(valibotControllerClaimSchema, input).success).toBe(
        false,
      )
      expect(zodControllerClaimSchema.safeParse(input).success).toBe(false)
    }
  })

  it("rejects non-DID id and controller values", () => {
    for (const input of [
      { ...validClaim, id: "agent.example.com" },
      { ...validClaim, controller: "not-a-did" },
    ]) {
      expect(v.safeParse(valibotControllerClaimSchema, input).success).toBe(
        false,
      )
      expect(zodControllerClaimSchema.safeParse(input).success).toBe(false)
    }
  })
})
