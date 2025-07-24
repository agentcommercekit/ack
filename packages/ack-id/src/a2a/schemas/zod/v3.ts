import { z } from "zod/v3"

const roleSchema = z.enum(["agent", "user"])

const metadataSchema = z.record(z.string(), z.unknown()).nullable()

// Base schema for common part properties
const partBaseSchema = z.object({
  metadata: metadataSchema.optional()
})

// Text part schema
export const textPartSchema = partBaseSchema.extend({
  type: z.literal("text"),
  text: z.string()
})

// Data part schema
export const dataPartSchema = partBaseSchema.extend({
  type: z.literal("data"),
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
})

// File content schema
export const fileContentSchema = z.object({
  name: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  bytes: z.string().nullable().optional(),
  uri: z.string().nullable().optional()
})

// File part schema
export const filePartSchema = partBaseSchema.extend({
  type: z.literal("file"),
  file: fileContentSchema
})

// Union of all part types using discriminated union
export const partSchema = z.discriminatedUnion("type", [
  textPartSchema,
  dataPartSchema,
  filePartSchema
])

// Message schema
export const messageSchema = z
  .object({
    role: roleSchema,
    parts: z.array(partSchema),
    metadata: metadataSchema.optional()
  })
  .passthrough()
