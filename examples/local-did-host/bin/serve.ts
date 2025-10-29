import app from "@/index"
import { buildUrl } from "@/lib/build-url"
import { getIdentityDid } from "@/lib/identity"
import { serve } from "@hono/node-server"

serve(
  {
    fetch: app.fetch,
    hostname: process.env.HOSTNAME ?? "0.0.0.0",
    port: parseInt(process.env.PORT ?? "3458")
  },
  ({ address, port }) =>
    Promise.all([
      getIdentityDid(buildUrl(address, port, "/agent")),
      getIdentityDid(buildUrl(address, port, "/controller"))
    ]).then(([agent, controller]) => {
      console.log(`> server running at http://${address}:${port}`)
      console.table([
        {
          name: "Agent",
          didUri: agent,
          url: buildUrl(address, port, "/agent/.well-known/did.json")
        },
        {
          name: "Controller",
          didUri: controller,
          url: buildUrl(address, port, "/controller/.well-known/did.json")
        }
      ])
    })
)
