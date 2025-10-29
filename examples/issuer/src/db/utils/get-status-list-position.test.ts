import { describe, expect, it } from "vitest"
import { STATUS_LIST_MAX_SIZE } from "../schema"
import { getStatusListPosition } from "./get-status-list-position"

describe("getStatusListPosition", () => {
  it("returns correct position for index 1", () => {
    const result = getStatusListPosition(1)
    expect(result).toEqual({
      id: 0,
      index: 0
    })
  })

  it("returns correct position for index within first list", () => {
    const result = getStatusListPosition(5)
    expect(result).toEqual({
      id: 0,
      index: 4
    })
  })

  it("returns correct position for index at list boundary", () => {
    const result = getStatusListPosition(STATUS_LIST_MAX_SIZE + 1)
    expect(result).toEqual({
      id: 1,
      index: 0
    })
  })

  it("returns correct position for index just after list boundary", () => {
    const result = getStatusListPosition(STATUS_LIST_MAX_SIZE + 2)
    expect(result).toEqual({
      id: 1,
      index: 1
    })
  })

  it("returns valid index for larger indices", () => {
    const result = getStatusListPosition(STATUS_LIST_MAX_SIZE * 3 + 42)
    expect(result).toEqual({
      id: 3,
      index: 41
    })
  })

  it("throws an error for non-integer indices", () => {
    expect(() => getStatusListPosition(1.5)).toThrow()
    expect(() => getStatusListPosition(NaN)).toThrow()
  })

  it("throws an error for negative indices", () => {
    expect(() => getStatusListPosition(-1)).toThrow()
  })
})
