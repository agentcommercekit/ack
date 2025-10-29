import { serve } from "@hono/node-server"
import { logger } from "@repo/api-utils/middleware/logger"
import { colors, errorMessage, log } from "@repo/cli-tools"
import {
  createJwt,
  getDidResolver,
  verifyPaymentRequestToken,
  type JwtString,
  type PaymentReceiptCredential,
  type Verifiable
} from "agentcommercekit"
import { jwtStringSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type Env, type TypedResponse } from "hono"
import { env } from "hono/adapter"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"
import { PAYMENT_SERVICE_URL } from "./constants"
import { getKeypairInfo } from "./utils/keypair-info"

const app = new Hono<Env>()
app.use(logger())

const bodySchema = v.object({
  paymentOptionId: v.string(),
  paymentRequestToken: jwtStringSchema
})

const name = colors.green(colors.bold("[Payment Service]"))

/**
 * Simple endpoint which would initiate a payment flow. In the case
 * of a stripe payment, it will return the Stripe payment URL where
 * the payment can be completed.
 */
app.post("/", async (c): Promise<TypedResponse<{ paymentUrl: string }>> => {
  const { paymentOptionId, paymentRequestToken } = v.parse(
    bodySchema,
    await c.req.json()
  )

  // Verify the payment request token and payment option are valid
  await validatePaymentOption(paymentOptionId, paymentRequestToken)

  log(colors.dim(`${name} Generating Stripe payment URL ...`))

  // This is a placeholder for an actual Strip Payment URL which would
  // have webhook callbacks already set up
  const paymentUrl = `https://payments.stripe.com/payment-url/?return_to=${PAYMENT_SERVICE_URL}/stripe-callback`

  return c.json({
    paymentUrl
  })
})

const callbackSchema = v.object({
  ...bodySchema.entries,
  metadata: v.object({
    eventId: v.string()
  })
})

app.post(
  "/stripe-callback",
  async (c): Promise<TypedResponse<{ receipt: string }>> => {
    const serverIdentity = await getKeypairInfo(
      env(c).PAYMENT_SERVICE_PRIVATE_KEY_HEX
    )

    const { paymentOptionId, paymentRequestToken, metadata } = v.parse(
      callbackSchema,
      await c.req.json()
    )

    // Verify the payment request token and payment option are valid
    const { paymentOption } = await validatePaymentOption(
      paymentOptionId,
      paymentRequestToken
    )
    const receiptServiceUrl = paymentOption.receiptService
    if (!receiptServiceUrl) {
      throw new Error(errorMessage("Receipt service URL is required"))
    }

    const payload = {
      paymentRequestToken,
      paymentOptionId,
      metadata: {
        network: "stripe",
        eventId: metadata.eventId
      },
      payerDid: serverIdentity.did
    }

    const signedPayload = await createJwt(payload, {
      issuer: serverIdentity.did,
      signer: serverIdentity.jwtSigner
    })

    log(colors.dim(`${name} Getting receipt from Receipt Service...`))
    const response = await fetch(receiptServiceUrl, {
      method: "POST",
      body: JSON.stringify({
        payload: signedPayload
      })
    })

    const { receipt, details } = (await response.json()) as {
      receipt: string
      details: Verifiable<PaymentReceiptCredential>
    }

    return c.json({
      receipt,
      details
    })
  }
)

async function validatePaymentOption(
  paymentOptionId: string,
  paymentRequestToken: JwtString
) {
  const didResolver = getDidResolver()

  log(colors.dim(`${name} Verifying payment request token...`))
  const { paymentRequest } = await verifyPaymentRequestToken(
    paymentRequestToken,
    {
      resolver: didResolver
    }
  )

  log(colors.dim(`${name} Checking for payment option...`))
  const paymentOption = paymentRequest.paymentOptions.find(
    (option) => option.id === paymentOptionId
  )

  if (!paymentOption) {
    log(errorMessage(`${name} Invalid payment option`))
    throw new HTTPException(400, {
      message: "Invalid payment option"
    })
  }

  return {
    paymentRequest,
    paymentOption
  }
}

serve({
  port: 4569,
  fetch: app.fetch
})
