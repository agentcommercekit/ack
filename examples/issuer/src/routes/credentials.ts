import {
  apiSuccessResponse,
  type ApiResponse,
} from "@repo/api-utils/api-response"
import {
  internalServerError,
  notFound,
  unauthorized,
} from "@repo/api-utils/exceptions"
import { signedPayloadValidator } from "@repo/api-utils/middleware/signed-payload-validator"
import {
  createControllerCredential,
  isControllerCredential,
  resolveDidWithController,
} from "agentcommercekit"
import { didUriSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type Env } from "hono"
import { env } from "hono/adapter"
import * as v from "valibot"

import type { CredentialResponse } from "@/lib/types"

import {
  createCredential as createDatabaseCredential,
  getCredential,
  revokeCredential,
} from "@/db/queries/credentials"
import { buildSignedCredential } from "@/lib/credentials/build-signed-credential"
import { database } from "@/middleware/database"
import { didResolver } from "@/middleware/did-resolver"
import { issuer } from "@/middleware/issuer"

const app = new Hono<Env>()
app.use("*", issuer())
app.use("*", didResolver())
app.use("*", database())

const bodySchema = v.object({
  controller: didUriSchema,
  subject: didUriSchema,
})

/**
 * POST /credentials/controller
 *
 * @description Creates a controller credential that proves one DID controls another
 *
 * Request Body, signed by the controller:
 * ```ts
 * SignedPayload<{
 *   controller: string, // DID URI of the controller
 *   subject: string     // DID URI of the subject being controlled
 * }>
 * ```
 *
 * @returns {
 *   credential: <Verifiable<W3CCredential>>,
 *   jwt: JWTString
 * }
 * Auth: Request must be signed by the controller DID
 */
app.post(
  "/",
  signedPayloadValidator("json", bodySchema),
  async (c): Promise<ApiResponse<CredentialResponse>> => {
    const payload = c.req.valid("json")
    const issuer = c.get("issuer")
    const resolver = c.get("resolver")
    const db = c.get("db")
    const { BASE_URL } = env(c)

    // Check that the payload is signed by the controller
    if (payload.issuer !== payload.body.controller) {
      return unauthorized("Target controller does not match")
    }

    // Check that the subject is a valid did with a valid, resolvable controller
    const { did, controller } = await resolveDidWithController(
      payload.body.subject,
      resolver,
    )

    if (controller.did !== payload.body.controller) {
      return unauthorized(`Target controller does not match`)
    }

    const baseCredential = createControllerCredential({
      subject: did,
      controller: controller.did,
      issuer: issuer.did,
    })

    const credential = await createDatabaseCredential(db, {
      credentialType: "ControllerCredential",
      baseCredential,
    })

    const result = await buildSignedCredential({
      baseUrl: BASE_URL,
      path: "/credentials/controller",
      issuer,
      credential,
      resolver,
    })

    return c.json(apiSuccessResponse(result))
  },
)

/**
 * GET /credentials/controller:id
 *
 * @description Retrieves a credential by its unique identifier
 *
 * URL Parameters:
 * - id: string - Unique identifier of the credential
 *
 * @returns {
 *   credential: <Verifiable<W3CCredential>>,
 *   jwt: JWTString
 * }
 */
app.get("/:id", async (c): Promise<ApiResponse<CredentialResponse>> => {
  const { id } = c.req.param()
  const db = c.get("db")
  const issuer = c.get("issuer")
  const resolver = c.get("resolver")
  const { BASE_URL } = env(c)

  const credential = await getCredential(db, parseInt(id))

  if (!credential) {
    return notFound("Credential not found")
  }

  const result = await buildSignedCredential({
    baseUrl: BASE_URL,
    path: "/credentials/controller",
    issuer,
    credential,
    resolver,
  })

  return c.json(apiSuccessResponse(result))
})

const deleteBodySchema = v.object({
  id: v.number(),
})

/**
 * DELETE /credentials/controller
 *
 * @description Revokes a credential by adding it to a status list
 *
 * Request Body, signed by the controller:
 * ```
 * SignedPayload<{
 *   id: string  // ID of the credential to revoke
 * }>
 * ```
 *
 * @returns Success response with null data
 * Auth: Request must be signed by the controller of the credential
 */
app.delete(
  "/",
  signedPayloadValidator("json", deleteBodySchema),
  async (c): Promise<ApiResponse<null>> => {
    const payload = c.req.valid("json")

    const db = c.get("db")
    const databaseCredential = await getCredential(db, payload.body.id)

    if (!databaseCredential) {
      return notFound("Credential not found")
    }

    const credential = databaseCredential.baseCredential

    if (!isControllerCredential(credential)) {
      return internalServerError("Invalid stored credential")
    }

    const { controller } = credential.credentialSubject

    if (controller !== payload.issuer) {
      return unauthorized()
    }

    await revokeCredential(db, databaseCredential)

    return c.json(apiSuccessResponse(null))
  },
)

export default app
