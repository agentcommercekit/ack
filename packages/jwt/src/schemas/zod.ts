import { JwtPayloadSchema } from "web-identity-schemas/zod"
import * as z from "zod"

import type { JwtHeader } from "../create-jwt"
import { jwtAlgorithms } from "../jwt-algorithm"

/**
 * JWT payload schema, backed by `web-identity-schemas`.
 *
 * Note: w-i-s types this as a `z.ZodType` (not a `ZodObject`), so `.shape` is
 * not available to consumers — compose with `jwtPayloadSchema.and(...)` to
 * extend it (see `demos/skyfire-kya`).
 */
export const jwtPayloadSchema = JwtPayloadSchema

/**
 * JWT header restricted to the algorithms ACK signs with.
 *
 * `web-identity-schemas`' `JwtHeaderSignedSchema` allows all JOSE algorithms;
 * ACK only ever signs with `ES256`/`ES256K`/`EdDSA`, so this wrapper keeps the
 * narrow set.
 */
export const jwtHeaderSchema = z
  .looseObject({
    typ: z.literal("JWT"),
    alg: z.enum(jwtAlgorithms),
  })
  .refine((val): val is JwtHeader => true)

/**
 * JWT string schema requiring a non-empty signature segment.
 *
 * Stricter than `web-identity-schemas`' `JwtStringSchema` (which permits an
 * empty signature) — see {@link isJwtString}.
 */
export const jwtStringSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/)
