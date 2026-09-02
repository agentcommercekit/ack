import {
  createSignedPaymentRequest,
  verifyPaymentReceipt,
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

function extractReceipt(c: Context): string | undefined {
  const proofHeader = c.req.header(RECEIPT_HEADER)
  if (proofHeader) {
    return proofHeader
  }

  const authorization = c.req.header("Authorization")
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim()
  }

  return undefined
}

/**
 * ACK-Pay HTTP 402 middleware. Issues a signed payment challenge when no valid
 * receipt is supplied; otherwise verifies the receipt and injects `ackPayment`.
 */
export const paymentRequiredValidator = (
  options: PaymentRequiredOptions,
): MiddlewareHandler<PaymentRequiredEnv> => {
  return async (c, next) => {
    const receipt = extractReceipt(c)

    if (!receipt) {
      const paymentRequestInit =
        typeof options.paymentRequest === "function"
          ? await options.paymentRequest(c)
          : options.paymentRequest

      const challenge = await createSignedPaymentRequest(paymentRequestInit, {
        issuer: options.issuer,
        signer: options.signer,
        algorithm: options.algorithm,
      })

      throw paymentRequired(challenge)
    }

    try {
      const ackPayment = await verifyPaymentReceipt(receipt, {
        resolver: options.resolver,
        trustedReceiptIssuers: options.trustedReceiptIssuers,
        paymentRequestIssuer: options.issuer,
      })

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
