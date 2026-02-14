import {
  apiSuccessResponse,
  type ApiResponse,
} from "@repo/api-utils/api-response"
import { Hono, type Env } from "hono"

const app = new Hono<Env>()

/**
 * GET /ping
 *
 * @description Simple health check endpoint to verify the API is running
 * @returns Current timestamp in ISO format
 */
app.get("/", (c): ApiResponse<{ pong: string }> => {
  return c.json(apiSuccessResponse({ pong: new Date().toISOString() }))
})

export default app
