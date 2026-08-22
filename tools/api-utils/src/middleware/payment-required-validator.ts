import type { Resolvable } from "@agentcommercekit/did"
import type { JwtAlgorithm, JwtSigner } from "@agentcommercekit/jwt"
import {
  createSignedPaymentRequest,
  verifyPaymentReceipt,
  type PaymentRequest,
  type PaymentRequestInit,
} from "@agentcommercekit/ack-pay"
import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"

export interface PaymentRequiredEnv {
  Variables: {
    resolver?: Resolvable
    ackPayment: {
      receipt: unknown
      paymentRequestToken: string
      paymentRequest: PaymentRequest | null
    }
  }
}

export interface PaymentRequestSignerOptions {
  issuer: string
  signer: JwtSigner
  algorithm?: JwtAlgorithm
}

export interface PaymentRequiredValidatorOptions {
  /**
   * The payment request configuration or a dynamic resolver function
   */
  paymentRequest:
    | PaymentRequestInit
    | ((c: Context) => Promise<PaymentRequestInit> | PaymentRequestInit)

  /**
   * The signer configuration for signing the payment request token JWT
   */
  signerOptions:
    | PaymentRequestSignerOptions
    | ((c: Context) => Promise<PaymentRequestSignerOptions> | PaymentRequestSignerOptions)

  /**
   * The list of trusted receipt issuer DIDs
   */
  trustedReceiptIssuers?:
    | string[]
    | ((c: Context) => Promise<string[]> | string[])

  /**
   * The expected issuer of the original payment request token
   */
  paymentRequestIssuer?: string

  /**
   * Whether to verify the payment request token as a JWT (defaults to true)
   */
  verifyPaymentRequestTokenJwt?: boolean
}

/**
 * Middleware that enforces an ACK-Pay HTTP 402 challenge.
 *
 * If no receipt is present in the `Authorization: Bearer <receipt>` or
 * `X-ACK-Payment-Proof` headers, it automatically issues an HTTP 402 status code
 * and returns the signed ACK-Pay payment request body.
 *
 * When a receipt is present, it verifies the receipt against trusted issuers and
 * attaches the verified payment details to `c.get("ackPayment")`.
 *
 * @example
 * ```ts
 * app.get(
 *   "/resource",
 *   paymentRequiredValidator({
 *     paymentRequest: paymentRequestConfig,
 *     signerOptions: serverSignerConfig,
 *     trustedReceiptIssuers: ["did:web:receipt.catena.com"],
 *   }),
 *   (c) => {
 *     const payment = c.get("ackPayment")
 *     return c.json({ access: "granted", payment })
 *   }
 * )
 * ```
 */
export const paymentRequiredValidator = (
  options: PaymentRequiredValidatorOptions,
): MiddlewareHandler<PaymentRequiredEnv> => {
  return async (c, next) => {
    const authorizationHeader = c.req.header("Authorization")
    const proofHeader = c.req.header("X-ACK-Payment-Proof")

    const receipt = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.replace("Bearer ", "").trim()
      : proofHeader?.trim()

    if (!receipt) {
      const init =
        typeof options.paymentRequest === "function"
          ? await options.paymentRequest(c)
          : options.paymentRequest

      const signer =
        typeof options.signerOptions === "function"
          ? await options.signerOptions(c)
          : options.signerOptions

      const signedPaymentRequest = await createSignedPaymentRequest(
        init,
        signer,
      )

      const res = new Response(JSON.stringify(signedPaymentRequest), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
        },
      })

      throw new HTTPException(402, { res })
    }

    const didResolver = c.get("resolver")
    const trustedReceiptIssuers =
      typeof options.trustedReceiptIssuers === "function"
        ? await options.trustedReceiptIssuers(c)
        : options.trustedReceiptIssuers

    try {
      const verified = await verifyPaymentReceipt(receipt, {
        resolver: didResolver!,
        trustedReceiptIssuers,
        paymentRequestIssuer: options.paymentRequestIssuer,
        verifyPaymentRequestTokenJwt:
          options.verifyPaymentRequestTokenJwt ?? true,
      })

      c.set("ackPayment", verified)
    } catch (_e) {
      throw new HTTPException(400, {
        message: "Invalid receipt",
      })
    }

    await next()
  }
}
