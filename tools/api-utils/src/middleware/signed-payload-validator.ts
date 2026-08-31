import { isDidUri, type DidUri, type Resolvable } from "@agentcommercekit/did"
import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import type { MiddlewareHandler, ValidationTargets } from "hono"
import { env } from "hono/adapter"
import { validator } from "hono/validator"
import * as v from "valibot"

import { validatePayload } from "../validate-payload"
import { unauthorized } from "../exceptions"

interface SignedPayloadEnv {
  Variables: {
    resolver: Resolvable
  }
}

interface ValidatedSignedPayload<T> {
  issuer: DidUri
  body: T
}

const signedPayloadSchema = v.object({
  payload: v.custom<JwtString>(
    (input: unknown) => typeof input === "string" && isJwtString(input),
    "Invalid JWT format",
  ),
})

/**
 * A validation middleware for signed JWT payloads. This will parse the JWT
 * payload, ensure it is properly signed and not expired, and validate it
 * against the provided schema.
 *
 * @example
 * ```ts
 * app.post("/", signedPayloadValidator("json", bodySchema), (c) => {
 *   const { parsed, payload } = c.req.valid("json")
 *
 *   parsed.issuer // did:web:example.com
 *   payload // { name: "John Doe", age: 30 }
 * })
 * ```
 */
export const signedPayloadValidator = <S extends v.GenericSchema>(
  target: keyof ValidationTargets,
  schema: S,
): MiddlewareHandler<
  SignedPayloadEnv,
  string,
  { out: { json: ValidatedSignedPayload<v.InferOutput<S>> } }
> =>
  validator(
    target,
    async (value, c): Promise<ValidatedSignedPayload<v.InferOutput<S>>> => {
      const didResolver = c.get("resolver")

      try {
        const data = v.parse(signedPayloadSchema, value)
        const { parsed, body } = await validatePayload(
          data.payload,
          schema,
          didResolver,
        )

        // Enforces a DID for the issuer
        if (!isDidUri(parsed.issuer)) {
          throw unauthorized("Invalid issuer")
        }

        return {
          issuer: parsed.issuer,
          body,
        }
      } catch (error) {
        // Fallback for development/testing environments where unsigned payloads are allowed
        const { ALLOW_UNSIGNED_PAYLOADS } = env<{
          ALLOW_UNSIGNED_PAYLOADS?: string
        }>(c)

        if (ALLOW_UNSIGNED_PAYLOADS === "true") {
          const issuer = c.req.header("X-Payload-Issuer")

          if (!issuer || !isDidUri(issuer)) {
            throw unauthorized("Invalid issuer")
          }

          const body = v.parse(schema, value)

          return {
            issuer,
            body,
          }
        }

        throw error
      }
    },
  )
