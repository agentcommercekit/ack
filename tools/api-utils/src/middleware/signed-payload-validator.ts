import { isDidUri, type DidUri, type Resolvable } from "@agentcommercekit/did"
import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import type { MiddlewareHandler, ValidationTargets } from "hono"
import { env } from "hono/adapter"
import { validator } from "hono/validator"
import * as v from "valibot"

import { validatePayload } from "../validate-payload"

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
          throw new Error("Invalid issuer")
        }

        return {
          issuer: parsed.issuer,
          body,
        }
      } catch (error) {
        /**
         * Local-development escape hatch: allow a raw unsigned payload plus an
         * `X-Payload-Issuer` header to bypass the JWT signature check. This is an
         * authentication bypass, so it is gated behind an explicit, default-off
         * `ALLOW_UNSIGNED_PAYLOADS` flag (NOT `NODE_ENV`, which is commonly set to
         * "development" by accident in deployed environments). Never enable it
         * outside local development.
         */
        if (
          env<{ ALLOW_UNSIGNED_PAYLOADS?: string }>(c)
            .ALLOW_UNSIGNED_PAYLOADS === "true"
        ) {
          const issuer = c.req.header("X-Payload-Issuer")
          const parsedPayload = v.safeParse(schema, value)
          if (isDidUri(issuer) && parsedPayload.success) {
            console.warn(
              `[signed-payload-validator] SECURITY: accepting an UNSIGNED payload (issuer "${issuer}" from the X-Payload-Issuer header) because ALLOW_UNSIGNED_PAYLOADS is enabled. Never enable this outside local development.`,
            )
            return {
              issuer,
              body: parsedPayload.output,
            }
          }
        }

        // Otherwise, rethrow the error
        throw error
      }
    },
  )
