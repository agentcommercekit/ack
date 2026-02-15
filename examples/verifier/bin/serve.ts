import { serve } from "@hono/node-server"

import app from "@/index"

serve(
  {
    fetch: app.fetch,
    port: 3457,
  },
  ({ port }) => {
    console.log(`> verifier running at http://localhost:${port}`)
  },
)
