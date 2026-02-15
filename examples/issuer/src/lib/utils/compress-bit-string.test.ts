import { BitBuffer } from "bit-buffers"
import { describe, expect, it } from "vitest"

import { compressBitString } from "./compress-bit-string"

describe("compressBitString", () => {
  it("should compress an empty bit string", () => {
    const expectedResult = new BitBuffer(0).toBitstring()

    expect(compressBitString("")).toBe(expectedResult)
  })

  it("should compress a bit string with the right number of bits", () => {
    const input = "0".repeat(1000)

    const expectedResult = new BitBuffer(input.length).toBitstring()
    expect(compressBitString(input)).toBe(expectedResult)
  })

  it("should compress a bit string with bits set at the right indices", () => {
    const indices = [42, 137, 256, 389, 512, 624, 777, 888, 945, 999]

    const input = Array(1000).fill("0")

    indices.forEach((index) => {
      input[index] = "1"
    })

    const inputString = input.join("")

    const bitBuffer = new BitBuffer(input.length)

    const finalBitBuffer = indices.reduce((buffer, index) => {
      return buffer.set(index)
    }, bitBuffer)

    const expectedResult = finalBitBuffer.toBitstring()

    expect(compressBitString(inputString)).toBe(expectedResult)
  })
})
