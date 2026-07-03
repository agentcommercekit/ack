import * as v from "valibot"
import { JwtPayloadSchema } from "web-identity-schemas/valibot"

import type { JwtHeader } from "../create-jwt"
import { jwtAlgorithms } from "../jwt-algorithm"

/**
 * JWT payload schema, backed by `web-identity-schemas`. Kept as a raw
 * loose-object schema so consumers can spread `.entries`.
 */
export const jwtPayloadSchema = JwtPayloadSchema

/**
 * JWT header restricted to the algorithms ACK signs with.
 *
 * `web-identity-schemas`' `JwtHeaderSignedSchema` allows all JOSE algorithms;
 * ACK only ever signs with `ES256`/`ES256K`/`EdDSA`, so this wrapper keeps the
 * narrow set.
 */
export const jwtHeaderSchema = v.pipe(
  v.looseObject({
    typ: v.literal("JWT"),
    alg: v.picklist(jwtAlgorithms),
  }),
  v.custom<JwtHeader>(() => true),
)

/**
 * JWT string schema requiring a non-empty signature segment.
 *
 * Stricter than `web-identity-schemas`' `JwtStringSchema` (which permits an
 * empty signature) — see {@link isJwtString}.
 */
export const jwtStringSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/),
)
