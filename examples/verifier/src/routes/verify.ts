import { vValidator } from "@hono/valibot-validator"
import {
  apiSuccessResponse,
  type ApiResponse
} from "@repo/api-utils/api-response"
import {
  createDidWebUri,
  getControllerClaimVerifier,
  getDidResolver,
  getReceiptClaimVerifier,
  isJwtString,
  parseJwtCredential,
  verifyParsedCredential
} from "agentcommercekit"
import {
  credentialSchema,
  jwtStringSchema
} from "agentcommercekit/schemas/valibot"
import { Hono, type Env } from "hono"
import { ValiError } from "valibot"
import * as v from "valibot"

const app = new Hono<Env>()

// Treat the local `issuer` API as trusted.
const trustedIssuers: string[] = [
  createDidWebUri(new URL("http://localhost:3456"))
]

const bodySchema = v.object({
  credential: v.union([credentialSchema, jwtStringSchema])
})

app.post(
  "/",
  vValidator("json", bodySchema, (result) => {
    if (!result.success) {
      throw new ValiError(result.issues)
    }
  }),
  async (c): Promise<ApiResponse<null>> => {
    const resolver = getDidResolver()
    let { credential } = c.req.valid("json")

    if (isJwtString(credential)) {
      credential = await parseJwtCredential(credential, resolver)
    }

    await verifyParsedCredential(credential, {
      trustedIssuers,
      resolver,
      verifiers: [getControllerClaimVerifier(), getReceiptClaimVerifier()]
    })

    return c.json(apiSuccessResponse(null))
  }
)

export default app
