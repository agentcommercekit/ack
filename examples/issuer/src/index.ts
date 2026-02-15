import { errorHandler } from "@repo/api-utils/middleware/error-handler"
import { logger } from "@repo/api-utils/middleware/logger"
import { Hono, type Env } from "hono"

import credentials from "./routes/credentials"
import healthcheck from "./routes/healthcheck"
import receipts from "./routes/receipts"
import status from "./routes/status"
import wellKnown from "./routes/well-known"

const app = new Hono<Env>()

app.use("*", logger())
app.onError(errorHandler)

app.route("/ping", healthcheck)
app.route("/status", status)
app.route("/credentials/controller", credentials)
app.route("/credentials/receipts", receipts)
app.route("/.well-known", wellKnown)

export default app
