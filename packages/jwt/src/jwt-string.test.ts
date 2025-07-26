import { describe, expect, it } from "vitest"
import { isJwtString } from "./jwt-string"

describe("isJwtString", () => {
  it("should return true for a valid JWT string", () => {
    expect(
      isJwtString(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
      )
    ).toBe(true)
  })

  it("should return false for an invalid JWT string", () => {
    expect(isJwtString("invalid")).toBe(false)
  })
})
