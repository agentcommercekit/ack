import type { Resolvable } from "@agentcommercekit/did"

import {
  verifyJwt,
  type JwtString,
  type JwtVerified,
} from "@agentcommercekit/jwt"
import * as v from "valibot"

import { unauthorized } from "./exceptions"

export type ParsedPayload<T> = {
  parsed: JwtVerified
  body: T
}

/**
 * Validates a JWT payload and returns the parsed payload and body
 *
 * NOTE: This does not perform logic beyond validating that the JWT is valid and
 * is properly signed.
 */
export async function validatePayload<T>(
  payload: JwtString,
  bodySchema: v.GenericSchema<unknown, T>,
  resolver?: Resolvable,
): Promise<ParsedPayload<T>> {
  let parsed: JwtVerified

  try {
    parsed = await verifyJwt(payload, {
      resolver,
      policies: {
        aud: false,
      },
    })
  } catch (_e) {
    unauthorized("Invalid payload")
  }

  const body = v.parse(bodySchema, parsed.payload)

  return {
    parsed,
    body,
  }
}
