import type { createSignedPaymentRequest } from "@agentcommercekit/ack-pay"
import { HTTPException } from "hono/http-exception"

/**
 * Helper functions
 */

export function badRequest(message = "Bad Request"): never {
  throw new HTTPException(400, {
    message,
  })
}

export function unauthorized(message = "Unauthorized"): never {
  throw new HTTPException(401, {
    message,
  })
}

export function forbidden(message = "Forbidden"): never {
  throw new HTTPException(403, {
    message,
  })
}

export function notFound(message = "Not Found"): never {
  throw new HTTPException(404, {
    message,
  })
}

export function internalServerError(message = "Internal Server Error"): never {
  throw new HTTPException(500, {
    message,
  })
}

type PaymentChallenge = Awaited<ReturnType<typeof createSignedPaymentRequest>>

export function paymentRequired(challenge: PaymentChallenge): never {
  throw new HTTPException(402, {
    res: new Response(JSON.stringify(challenge), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  })
}
