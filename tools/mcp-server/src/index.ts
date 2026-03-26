#!/usr/bin/env -S npx tsx
/**
 * ACK MCP Server
 *
 * Exposes Agent Commerce Kit operations as MCP tools, enabling any
 * MCP-compatible AI agent to create credentials, verify identities,
 * issue payment requests, and verify receipts.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { registerIdentityTools } from "./tools/identity"
import { registerPaymentReceiptTools } from "./tools/payment-receipts"
import { registerPaymentRequestTools } from "./tools/payment-requests"
import { registerUtilityTools } from "./tools/utility"

const server = new McpServer({
  name: "ack",
  version: "0.0.1",
})

registerIdentityTools(server)
registerPaymentRequestTools(server)
registerPaymentReceiptTools(server)
registerUtilityTools(server)

const transport = new StdioServerTransport()
await server.connect(transport)
