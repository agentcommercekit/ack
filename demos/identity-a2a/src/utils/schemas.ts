import * as v from "valibot"

// Valibot schemas for A2A response validation
const textPartSchema = v.object({
  type: v.literal("text"),
  text: v.string()
})

const dataPartWithJwtSchema = v.object({
  type: v.literal("data"),
  data: v.object({
    jwt: v.string()
  })
})

const partSchema = v.union([textPartSchema, dataPartWithJwtSchema])

export const messageSchema = v.object({
  role: v.union([v.literal("user"), v.literal("agent")]),
  parts: v.array(partSchema),
  metadata: v.optional(v.record(v.string(), v.unknown()))
})
