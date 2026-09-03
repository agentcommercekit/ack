import {
  createSignedPaymentRequest,
  verifyPaymentReceipt,
  type PaymentRequest,
  type PaymentRequestInit,
} from "@agentcommercekit/ack-pay"
import type { DidUri, Resolvable } from "@agentcommercekit/did"
import type { JwtAlgorithm, JwtSigner } from "@agentcommercekit/jwt"
import {
  CredentialVerificationError,
  InvalidCredentialError,
  UntrustedIssuerError,
} from "@agentcommercekit/vc"
import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"

import { badRequest, forbidden, paymentRequired } from "../exceptions"

export type AckPayment = Awaited<ReturnType<typeof verifyPaymentReceipt>>

export interface PaymentRequiredEnv {
  Variables: {
    ackPayment: AckPayment
  }
}

export interface PaymentRequiredOptions {
  resolver: Resolvable
  issuer: DidUri
  signer: JwtSigner
  algorithm: JwtAlgorithm
  trustedReceiptIssuers?: string[]
  /**
   * Static payment request fields or a per-request resolver.
   */
  paymentRequest:
    | PaymentRequestInit
    | ((c: Context) => PaymentRequestInit | Promise<PaymentRequestInit>)
}

const RECEIPT_HEADER = "x-ack-payment-proof"

/**
 * Extract a payment receipt JWT from request headers.
 * Distinguishes "header absent" from "header present but blank".
 */
function extractReceipt(c: Context):
  | { kind: "absent" }
  | { kind: "blank" }
  | { kind: "present"; receipt: string } {
  const proofHeader = c.req.header(RECEIPT_HEADER)
  if (proofHeader !== undefined) {
    const trimmed = proofHeader.trim()
    return trimmed
      ? { kind: "present", receipt: trimmed }
      : { kind: "blank" }
  }

  const authorization = c.req.header("Authorization")
  if (authorization !== undefined) {
    if (!authorization.startsWith("Bearer ")) {
      return { kind: "blank" }
    }
    const trimmed = authorization.slice("Bearer ".length).trim()
    return trimmed
      ? { kind: "present", receipt: trimmed }
      : { kind: "blank" }
  }

  return { kind: "absent" }
}

function receiptMatchesRequest(
  paymentRequest: PaymentRequest | null,
  expected: PaymentRequestInit,
): boolean {
  if (!paymentRequest) {
    return false
  }
  if (paymentRequest.id !== expected.id) {
    return false
  }
  const expectedOptionIds = new Set(
    expected.paymentOptions.map((option) => option.id),
  )
  return paymentRequest.paymentOptions.some((option) =>
    expectedOptionIds.has(option.id),
  )
}

/**
 * ACK-Pay HTTP 402 middleware. Issues a signed payment challenge when no valid
 * receipt is supplied; otherwise verifies the receipt and injects `ackPayment`.
 */
export const paymentRequiredValidator = (
  options: PaymentRequiredOptions,
): MiddlewareHandler<PaymentRequiredEnv> => {
  return async (c, next) => {
    const extracted = extractReceipt(c)

    if (extracted.kind === "blank") {
      badRequest("Invalid receipt")
    }

    const paymentRequestInit =
      typeof options.paymentRequest === "function"
        ? await options.paymentRequest(c)
        : options.paymentRequest

    if (extracted.kind === "absent") {
      const challenge = await createSignedPaymentRequest(paymentRequestInit, {
        issuer: options.issuer,
        signer: options.signer,
        algorithm: options.algorithm,
      })

      throw paymentRequired(challenge)
    }

    try {
      const ackPayment = await verifyPaymentReceipt(extracted.receipt, {
        resolver: options.resolver,
        trustedReceiptIssuers: options.trustedReceiptIssuers,
        paymentRequestIssuer: options.issuer,
      })

      if (!receiptMatchesRequest(ackPayment.paymentRequest, paymentRequestInit)) {
        badRequest("Invalid receipt")
      }

      c.set("ackPayment", ackPayment)
      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      if (error instanceof UntrustedIssuerError) {
        forbidden("Untrusted receipt issuer")
      }

      if (
        error instanceof InvalidCredentialError ||
        error instanceof CredentialVerificationError
      ) {
        badRequest("Invalid receipt")
      }

      throw error
    }
  }
}
