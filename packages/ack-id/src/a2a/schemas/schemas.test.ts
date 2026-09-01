import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { createA2AHandshakeMessageFromJwt } from "../sign-message"
import { messageSchema as valibotMessageSchema } from "./valibot"
import { messageSchema as zodMessageSchema } from "./zod"

// The two schema files are separate entry points onto the same A2A shape, so
// every case runs against both. A message that one accepts and the other
// rejects is exactly the drift these tests exist to catch.
const validators = {
  valibot: (value: unknown) => v.safeParse(valibotMessageSchema, value).success,
  zod: (value: unknown) => zodMessageSchema.safeParse(value).success,
}

describe.each(Object.entries(validators))(
  "A2A messageSchema (%s)",
  (_name, accepts) => {
    it("accepts a handshake message built by this package", () => {
      expect(accepts(createA2AHandshakeMessageFromJwt("user", "a.b.c"))).toBe(
        true,
      )
    })

    it("accepts a text message carrying task and context ids", () => {
      expect(
        accepts({
          kind: "message",
          messageId: "msg-1",
          role: "agent",
          parts: [{ kind: "text", text: "hello" }],
          taskId: "task-1",
          contextId: "ctx-1",
        }),
      ).toBe(true)
    })

    it("accepts a file part carrying a uri", () => {
      expect(
        accepts({
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [
            { kind: "file", file: { uri: "https://example.com/receipt.pdf" } },
          ],
        }),
      ).toBe(true)
    })

    it("accepts a file part carrying bytes", () => {
      expect(
        accepts({
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [
            {
              kind: "file",
              file: { mimeType: "application/pdf", bytes: "aGVsbG8=" },
            },
          ],
        }),
      ).toBe(true)
    })

    // `@a2a-js/sdk` v0.3 keys parts on `kind`. `type` is the pre-0.3 spelling.
    it("rejects a part keyed on type instead of kind", () => {
      expect(
        accepts({
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "hello" }],
        }),
      ).toBe(false)
    })

    it("rejects a message without a message kind", () => {
      expect(
        accepts({
          messageId: "msg-1",
          role: "user",
          parts: [{ kind: "text", text: "hello" }],
        }),
      ).toBe(false)
    })

    it("rejects a message without a messageId", () => {
      expect(
        accepts({
          kind: "message",
          role: "user",
          parts: [{ kind: "text", text: "hello" }],
        }),
      ).toBe(false)
    })
  },
)
