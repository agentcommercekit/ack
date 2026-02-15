import { createJwt } from "@agentcommercekit/jwt"
import { sValidator } from "@hono/standard-validator"
import { logger } from "@repo/api-utils/middleware/logger"
import { Hono } from "hono"
import * as v from "valibot"

import { identities } from "./middleware/identities"

const app = new Hono()

app.use("*", logger())
app.use("*", identities())

/**
 * Get the DID document
 */
app.get(
  "/:entity/.well-known/did.json",
  sValidator(
    "param",
    v.object({
      entity: v.picklist(["agent", "controller"]),
    }),
  ),
  (c) => {
    const { entity } = c.req.valid("param")
    const identities = c.get("identities")
    return c.json(identities[entity].didDocument)
  },
)

/**
 * Sign a JWT with content
 */
app.post(
  "/:entity/sign",
  sValidator(
    "param",
    v.object({
      entity: v.picklist(["agent", "controller"]),
    }),
  ),
  sValidator(
    "json",
    v.object({
      subject: v.string(),
      payload: v.record(v.string(), v.unknown()),
      audience: v.optional(v.string()),
      expiresIn: v.optional(v.number()),
    }),
  ),
  async (c) => {
    const { signer, did, alg } = c.get("identities").agent
    const { subject, payload, audience, expiresIn } = c.req.valid("json")

    const jwt = await createJwt(
      {
        ...payload,
        sub: subject,
        aud: audience,
      },
      {
        alg,
        issuer: did,
        expiresIn,
        signer,
        canonicalize: true,
      },
    )

    return c.json({ jwt })
  },
)

export default app
