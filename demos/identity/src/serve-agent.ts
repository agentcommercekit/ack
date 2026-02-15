import { serve } from "@hono/node-server"
import { sValidator } from "@hono/standard-validator"
import { logger } from "@repo/api-utils/middleware/logger"
import { colors } from "@repo/cli-tools"
import { Hono } from "hono"
import * as v from "valibot"

import type { Agent } from "./agent"

type ServeAgentConfig = {
  agent: Agent
  port: number
}

export function serveAgent({ port, agent }: ServeAgentConfig) {
  console.log(colors.dim(`> Starting local server...`))

  const app = new Hono()
  app.use("*", logger())
  app.post(
    "/chat",
    sValidator("json", v.object({ message: v.string() })),
    async (c) => {
      const { message } = c.req.valid("json")

      const text = await agent.run(message)

      return c.json({ text })
    },
  )

  app.post(
    "/identity/challenge",
    sValidator("json", v.object({ challenge: v.string() })),
    async (c) => {
      const { challenge } = c.req.valid("json")

      const signedChallenge = await agent.signChallenge(challenge)

      return c.json({ signedChallenge })
    },
  )

  app.get("/identity/vc", (c) => {
    return c.json(agent.getOwnershipVc())
  })

  serve({
    fetch: app.fetch,
    port,
  })

  console.log(colors.green(`Agent '${agent.did}' ready on port ${port}`))
}
