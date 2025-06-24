import { colors, createLogger } from "@repo/cli-tools"
import { A2AServer, DefaultA2ARequestHandler } from "a2a-js"
import type { Agent } from "../agent"
import type { Logger } from "@repo/cli-tools"
import type { Application } from "express"

type Options = {
  logger?: Logger
  host?: string
  port?: number
}

/**
 * Simple utility to start an A2A server with DID document hosting
 */
export function startAgentServer(
  agent: Agent,
  {
    logger = createLogger("server"),
    host = "0.0.0.0",
    port = 3001
  }: Options = {}
) {
  logger.log(`🏦 Starting ${agent.constructor.name} on port ${port}...`)
  logger.log(`🆔 Bank Teller DID: ${colors.dim(agent.did)}`)

  // Debug: Check if DID document exists
  const didDocument = agent.didDocument
  logger.log("✅ DID document created successfully")
  logger.log("   DID Document ID:", colors.dim(didDocument.id))

  // Create A2A server with the original AgentCard
  // The DID is now the top-level identifier, referenced in the DID document services
  const requestHandler = new DefaultA2ARequestHandler(agent)
  const server = new A2AServer(agent.agentCard, requestHandler)

  // Get the Express app and store it to ensure we use the same instance
  const app = server.app() as Application
  // Add DID document endpoint for did:web resolution
  app.get("/.well-known/did.json", (req, res) => {
    logger.log("🔍 Request for DID document:", colors.dim(req.url.toString()))
    const didDocument = agent.didDocument
    logger.log("🌐 Serving DID document for did:web resolution")
    res.json(didDocument)
  })

  logger.log(
    "🌐 DID document endpoint added at:",
    colors.dim("/.well-known/did.json")
  )

  // Start the server using the same app instance
  const expressServer = app.listen(port, host, () => {
    logger.log(`A2A Server running at ${colors.dim(`http://${host}:${port}`)}`)
    logger.log(
      `🌐 DID document available at: ${colors.dim(`http://localhost:${port}/.well-known/did.json`)}`
    )
  })

  // Return server instance for programmatic control
  return expressServer
}
