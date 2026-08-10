import { serve } from "@hono/node-server"
import { logger } from "@repo/api-utils/middleware/logger"
import { colors, errorMessage, log } from "@repo/cli-tools"
import {
  createJwt,
  getDidResolver,
  verifyPaymentRequestToken,
  type DidUri,
  type JwtString,
} from "agentcommercekit"
import { jwtStringSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type Context, type Env, type TypedResponse } from "hono"
import { env } from "hono/adapter"
import { HTTPException } from "hono/http-exception"
import * as v from "valibot"

import { PAYMENT_SERVICE_URL } from "./constants"
import { authorizePayment, demoPaymentPolicy } from "./payment-policy"
import { createSpendLedger, spendReference } from "./spend-ledger"
import { getKeypairInfo } from "./utils/keypair-info"

const app = new Hono<Env>()
app.use(logger())

/**
 * Tracks how much this Payment Service has already authorized inside the
 * policy's rolling window. In-memory, so it resets with the demo process.
 */
const spendLedger = createSpendLedger()

const bodySchema = v.object({
  paymentOptionId: v.string(),
  paymentRequestToken: jwtStringSchema,
})

const receiptResponseSchema = v.object({
  receipt: jwtStringSchema,
  details: v.union([jwtStringSchema, v.record(v.string(), v.unknown())]),
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
    await c.req.json(),
  )

  // Verify the payment request token and payment option are valid before
  // returning an execution URL.
  const { paymentRequest, paymentOption } = await validatePaymentOption(
    paymentOptionId,
    paymentRequestToken,
  )
  // Budget is reserved per payment execution, not per Payment Request. A
  // Payment Request can be presented for execution more than once, and each
  // execution moves money, so they must consume the budget separately. The id
  // is minted here and carried through the callback URL so the two calls of
  // one execution still reserve once.
  const executionId = crypto.randomUUID()
  const payerIdentity = await getPayerIdentity(c)
  await enforcePaymentPolicy(c, paymentOption, {
    subject: payerIdentity.did,
    reference: spendReference(paymentRequest.id, paymentOptionId, executionId),
  })

  log(colors.dim(`${name} Generating Stripe payment URL ...`))

  // This is a placeholder for an actual Strip Payment URL which would
  // have webhook callbacks already set up
  const returnTo = `${PAYMENT_SERVICE_URL}/stripe-callback?executionId=${executionId}`
  const paymentUrl = `https://payments.stripe.com/payment-url/?return_to=${encodeURIComponent(returnTo)}`

  return c.json({
    paymentUrl,
  })
})

const callbackSchema = v.object({
  ...bodySchema.entries,
  metadata: v.object({
    eventId: v.string(),
  }),
})

app.post(
  "/stripe-callback",
  async (c): Promise<TypedResponse<{ receipt: string }>> => {
    const payerIdentity = await getPayerIdentity(c)

    const { paymentOptionId, paymentRequestToken, metadata } = v.parse(
      callbackSchema,
      await c.req.json(),
    )

    // Verify the payment request token and payment option are valid
    const { paymentRequest, paymentOption } = await validatePaymentOption(
      paymentOptionId,
      paymentRequestToken,
    )
    const receiptServiceUrl = paymentOption.receiptService
    if (!receiptServiceUrl) {
      throw new Error(errorMessage("Receipt service URL is required"))
    }

    // Re-authorizing under the execution's own reference re-checks the window
    // without counting this payment a second time. A real Payment Service
    // would resolve the execution from the provider's session id server-side
    // rather than trusting the caller to echo it back; a caller that supplies
    // an unknown id here is charged against the budget again rather than
    // escaping it.
    const reference = spendReference(
      paymentRequest.id,
      paymentOptionId,
      c.req.query("executionId") ?? crypto.randomUUID(),
    )
    await enforcePaymentPolicy(c, paymentOption, {
      subject: payerIdentity.did,
      reference,
    })

    const payload = {
      paymentRequestToken,
      paymentOptionId,
      metadata: {
        network: "stripe",
        eventId: metadata.eventId,
      },
      payerDid: payerIdentity.did,
    }

    log(colors.dim(`${name} Getting receipt from Receipt Service...`))

    let receiptResponse: v.InferOutput<typeof receiptResponseSchema>
    try {
      const signedPayload = await createJwt(payload, {
        issuer: payerIdentity.did,
        signer: payerIdentity.jwtSigner,
      })

      const response = await fetch(receiptServiceUrl, {
        method: "POST",
        body: JSON.stringify({
          payload: signedPayload,
        }),
      })

      receiptResponse = v.parse(receiptResponseSchema, await response.json())
    } catch (error) {
      // The payment never produced a receipt, so it should not keep consuming
      // the window budget.
      spendLedger.release(reference)
      throw error
    }

    spendLedger.commit(reference)

    return c.json(receiptResponse)
  },
)

async function validatePaymentOption(
  paymentOptionId: string,
  paymentRequestToken: JwtString,
) {
  const didResolver = getDidResolver()

  log(colors.dim(`${name} Verifying payment request token...`))
  const { paymentRequest } = await verifyPaymentRequestToken(
    paymentRequestToken,
    {
      resolver: didResolver,
    },
  )

  log(colors.dim(`${name} Checking for payment option...`))
  const paymentOption = paymentRequest.paymentOptions.find(
    (option) => option.id === paymentOptionId,
  )

  if (!paymentOption) {
    log(errorMessage(`${name} Invalid payment option`))
    throw new HTTPException(400, {
      message: "Invalid payment option",
    })
  }

  return {
    paymentRequest,
    paymentOption,
  }
}

async function enforcePaymentPolicy(
  c: Context<Env>,
  paymentOption: Awaited<
    ReturnType<typeof validatePaymentOption>
  >["paymentOption"],
  { subject, reference }: { subject: DidUri; reference: string },
) {
  const decision = authorizePayment(
    paymentOption,
    {
      ...demoPaymentPolicy,
      allowedRecipients: await getTrustedRecipients(c),
    },
    {
      subject,
      reference,
      ledger: spendLedger,
    },
  )

  if (decision.status !== "approved") {
    log(errorMessage(`${name} ${decision.reason}`))
    throw new HTTPException(decision.status === "denied" ? 403 : 409, {
      message: decision.reason,
    })
  }
}

/**
 * The identity this Payment Service signs and spends as. The demo has a single
 * autonomous payer, so it is also the subject the spend budget is tracked
 * against.
 */
function getPayerIdentity(c: Context<Env>) {
  return getKeypairInfo(env(c).PAYMENT_SERVICE_PRIVATE_KEY_HEX)
}

async function getTrustedRecipients(c: Context<Env>) {
  const serverIdentity = await getKeypairInfo(env(c).SERVER_PRIVATE_KEY_HEX)
  return [serverIdentity.did]
}

serve({
  port: 4569,
  fetch: app.fetch,
})
