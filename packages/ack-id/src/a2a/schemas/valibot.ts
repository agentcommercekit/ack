import * as v from "valibot"

const roleSchema = v.union([v.literal("agent"), v.literal("user")])

const metadataSchema = v.nullable(v.record(v.string(), v.unknown()))

// Base schema for common part properties
const partBaseSchema = v.object({
  metadata: v.optional(metadataSchema),
})

// Text part schema
export const textPartSchema = v.object({
  ...partBaseSchema.entries,
  kind: v.literal("text"),
  text: v.string(),
})

// Data part schema
export const dataPartSchema = v.object({
  ...partBaseSchema.entries,
  kind: v.literal("data"),
  data: v.union([v.record(v.string(), v.unknown()), v.array(v.unknown())]),
})

// File content schema
export const fileWithBytesSchema = v.object({
  name: v.optional(v.nullable(v.string())),
  mimeType: v.optional(v.nullable(v.string())),
  bytes: v.optional(v.nullable(v.string())),
  uri: v.optional(v.nullable(v.string())),
})

export const fileWithUriSchema = v.object({
  name: v.optional(v.nullable(v.string())),
  mimeType: v.optional(v.nullable(v.string())),
  uri: v.optional(v.nullable(v.string())),
})

// File part schema
export const filePartSchema = v.object({
  ...partBaseSchema.entries,
  kind: v.literal("file"),
  file: v.union([fileWithBytesSchema, fileWithUriSchema]),
})

// Union of all part types using variant syntax
export const partSchema = v.variant("kind", [
  textPartSchema,
  dataPartSchema,
  filePartSchema,
])

// Message schema
export const messageSchema = v.looseObject({
  kind: v.literal("message"),
  messageId: v.string(),
  role: roleSchema,
  parts: v.array(partSchema),
  metadata: v.optional(metadataSchema),
  taskId: v.optional(v.string()),
  contextId: v.optional(v.string()),
  extensions: v.optional(v.array(v.string())),
  referenceTaskIds: v.optional(v.array(v.string())),
})
