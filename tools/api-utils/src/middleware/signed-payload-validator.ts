import { isDidUri, type DidUri, type Resolvable } from "@agentcommercekit/did"
import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import type { MiddlewareHandler, ValidationTargets } from "hono"
import { validator } from "hono/validator"
// SECURITY FIX: Removed 'env' import from 'hono/adapter' as environment-based authentication bypasses are explicitly forbidden.
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

      // SECURITY FIX: Removed the try-catch block and the `ALLOW_UNSIGNED_PAYLOADS` escape hatch.
      // We now strictly require a cryptographically signed JWT envelope for all protected routes.
      // Spoofed `X-Payload-Issuer` headers with raw bodies are no longer accepted under any environment condition.
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
    },
  )