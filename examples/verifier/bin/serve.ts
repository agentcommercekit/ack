import app from "@/index"
import { serve } from "@hono/node-server"

serve(
  {
    fetch: app.fetch,
    port: 3457,
  },
  ({ port }) => {
    console.log(`> verifier running at http://localhost:${port}`)
  },
)
