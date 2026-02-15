import type { DidDocument } from "agentcommercekit"

import { Hono, type Env, type TypedResponse } from "hono"

import { issuer } from "@/middleware/issuer"

const app = new Hono<Env>()

app.use("*", issuer())

/**
 * GET /.well-known/did.json
 *
 * @description Returns the DID document for the issuer
 * @returns DID Document in JSON format
 */
app.get("/did.json", (c): TypedResponse<DidDocument> => {
  const { didDocument } = c.get("issuer")

  return c.json(didDocument)
})

export default app
