import {
  apiSuccessResponse,
  type ApiResponse,
} from "@repo/api-utils/api-response"
import { Hono, type Env } from "hono"

const app = new Hono<Env>()

app.get("/", (c): ApiResponse<{ pong: string }> => {
  return c.json(apiSuccessResponse({ pong: new Date().toISOString() }))
})

export default app
