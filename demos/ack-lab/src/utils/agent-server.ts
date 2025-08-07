import { serve } from "@hono/node-server"
import { colors, log } from "@repo/cli-tools"
import type { BaseAgent } from "../agents/base-agent"
import type { SwapExecutorAgent } from "../agents/swap-executor"
import type { SwapRequestorAgent } from "../agents/swap-requestor"
import type { DataProviderAgent } from "../agents/data-provider"
import type { DataRequestorAgent } from "../agents/data-requestor"

/**
 * Start an HTTP server for an agent
 */
export async function startAgentServer(
  agent:
    | SwapExecutorAgent
    | SwapRequestorAgent
    | DataProviderAgent
    | DataRequestorAgent,
  port: number
): Promise<any> {
  const app = agent.createServer()

  log(colors.cyan(`🚀 Starting ${agent.did.slice(-20)} on port ${port}...`))

  return serve({
    fetch: app.fetch,
    port
  })
}
