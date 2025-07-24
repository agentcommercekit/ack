import { z } from "zod/v3"
import { jwtAlgorithms } from "../../jwt-algorithm"
import { isJwtString } from "../../jwt-string"
import type { JwtHeader, JwtPayload } from "../../create-jwt"

export const jwtPayloadSchema = z
  .object({
    iss: z.optional(z.string()),
    sub: z.optional(z.string()),
    aud: z.optional(z.union([z.string(), z.array(z.string())])),
    iat: z.optional(z.number()),
    nbf: z.optional(z.number()),
    exp: z.optional(z.number())
  })
  .passthrough()
  .refine((val): val is JwtPayload => true)

export const jwtHeaderSchema = z
  .object({
    typ: z.literal("JWT"),
    alg: z.enum(jwtAlgorithms)
  })
  .passthrough()
  .refine((val): val is JwtHeader => true)

export const jwtStringSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/)
  .refine((input) => isJwtString(input), {
    message: "Invalid JWT string"
  })
