import * as z from "zod"

const roleSchema = z.enum(["agent", "user"])

const metadataSchema = z.record(z.string(), z.unknown()).nullable()

// Base schema for common part properties
const partBaseSchema = z.object({
  metadata: metadataSchema.optional(),
})

// Text part schema
export const textPartSchema = partBaseSchema.extend({
  kind: z.literal("text"),
  text: z.string(),
})

// Data part schema
export const dataPartSchema = partBaseSchema.extend({
  kind: z.literal("data"),
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
})

// File content schemas
export const fileWithBytesSchema = z.object({
  name: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  bytes: z.string().nullable().optional(),
  uri: z.string().nullable().optional(),
})

export const fileWithUriSchema = z.object({
  name: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  uri: z.string().nullable().optional(),
})

// File part schema
export const filePartSchema = partBaseSchema.extend({
  kind: z.literal("file"),
  file: z.union([fileWithBytesSchema, fileWithUriSchema]),
})

// Union of all part types using discriminated union
export const partSchema = z.discriminatedUnion("kind", [
  textPartSchema,
  dataPartSchema,
  filePartSchema,
])

// Message schema
export const messageSchema = z.looseObject({
  kind: z.literal("message"),
  messageId: z.string(),
  role: roleSchema,
  parts: z.array(partSchema),
  metadata: metadataSchema.optional(),
  taskId: z.string().optional(),
  contextId: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  referenceTaskIds: z.array(z.string()).optional(),
})
