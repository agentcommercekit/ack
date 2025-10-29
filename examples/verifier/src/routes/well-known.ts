import { verifier } from "@/middleware/verifier"
import type { DidDocument } from "agentcommercekit"
import { Hono, type Env, type TypedResponse } from "hono"

const app = new Hono<Env>()

app.use("*", verifier())

app.get("/did.json", (c): TypedResponse<DidDocument> => {
  const { didDocument } = c.get("verifier")

  return c.json(didDocument)
})

export default app
