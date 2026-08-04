import { InvalidPaymentRequestTokenError } from "@agentcommercekit/ack-pay"
import { DidResolutionError } from "@agentcommercekit/did"
import {
  CredentialVerificationError,
  RevocationCheckError,
  UnsupportedCredentialStatusError,
} from "@agentcommercekit/vc"
import type { Env, ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"

import { formatErrorResponse } from "../api-response"

export const errorHandler: ErrorHandler<Env> = (err, c) => {
  if (
    err instanceof DidResolutionError ||
    err instanceof CredentialVerificationError ||
    err instanceof InvalidPaymentRequestTokenError
  ) {
    // These carry one fixed message so the response says nothing about the host
    // that was dereferenced or the status the credential declared. Log the
    // detail here, or the reason a verification failed is recorded nowhere.
    if (
      (err instanceof RevocationCheckError ||
        err instanceof UnsupportedCredentialStatusError) &&
      process.env.NODE_ENV !== "test"
    ) {
      console.error(err.detail ?? err.message, err.cause)
    }

    return c.json(formatErrorResponse(err), 400)
  }

  if (v.isValiError(err)) {
    return c.json(formatErrorResponse(err), 400)
  }

  if (err instanceof HTTPException) {
    if (err.status >= 500 && process.env.NODE_ENV !== "test") {
      console.error(err.stack)
    }

    if (err.res) {
      return err.res
    }

    return c.json(formatErrorResponse(err), err.status)
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err.stack)
  }

  return c.json(formatErrorResponse(err), 500)
}
