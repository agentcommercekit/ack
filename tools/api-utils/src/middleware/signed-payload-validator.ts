import { isDidUri, type DidUri, type Resolvable } from "@agentcommercekit/did"
import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import type { ValidationTargets } from "hono"
import { env } from "hono/adapter"
import { validator } from "hono/validator"
import * as v from "valibot"
import { validatePayload } from "../validate-payload"

interface ValidatedSignedPayload<T> {
  issuer: DidUri
  body: T
}

const signedPayloadSchema = v.object({
  payload: v.custom<JwtString>(
    (v: unknown) => typeof v === "string" && isJwtString(v),
    "Invalid JWT format"
  )
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
export const signedPayloadValidator = <T>(
  target: keyof ValidationTargets,
  schema: v.GenericSchema<unknown, T>
) =>
  validator(target, async (value, c): Promise<ValidatedSignedPayload<T>> => {
    const didResolver = c.get("resolver") as Resolvable | undefined

    try {
      const data = v.parse(signedPayloadSchema, value)
      const { parsed, body } = await validatePayload(
        data.payload,
        schema,
        didResolver
      )

      // Enforces a DID for the issuer
      if (!isDidUri(parsed.issuer)) {
        throw new Error("Invalid issuer")
      }

      return {
        issuer: parsed.issuer,
        body
      }
    } catch (error) {
      /**
       * If we are in development mode, allow passing a raw unsigned payload along
       * with an X-Payload-Issuer header to bypass the JWT signature check.
       */
      if (env<{ NODE_ENV: string }>(c).NODE_ENV === "development") {
        const issuer = c.req.header("X-Payload-Issuer")
        const parsedPayload = v.safeParse(schema, value)
        if (isDidUri(issuer) && parsedPayload.success) {
          return {
            issuer,
            body: parsedPayload.output
          }
        }
      }

      // Otherwise, rethrow the error
      throw error
    }
  })
