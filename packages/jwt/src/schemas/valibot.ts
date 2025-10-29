import * as v from "valibot"
import type { JwtHeader, JwtPayload } from "../create-jwt"
import { jwtAlgorithms } from "../jwt-algorithm"
import type { JwtString } from "../jwt-string"

export const jwtPayloadSchema = v.pipe(
  v.looseObject({
    iss: v.optional(v.string()),
    sub: v.optional(v.string()),
    aud: v.optional(v.union([v.string(), v.array(v.string())])),
    iat: v.optional(v.number()),
    nbf: v.optional(v.number()),
    exp: v.optional(v.number())
  }),
  v.custom<JwtPayload>(() => true)
)

export const jwtHeaderSchema = v.pipe(
  v.looseObject({
    typ: v.literal("JWT"),
    alg: v.picklist(jwtAlgorithms)
  }),
  v.custom<JwtHeader>(() => true)
)

export const jwtStringSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/),
  v.transform((input) => input as JwtString)
)
