import { describe, expect, it } from "vitest"

import { createAgentCardServiceEndpoint } from "./service-endpoints"

describe("createAgentCardServiceEndpoint", () => {
  it("creates a service endpoint linking a DID to its agent card URL", () => {
    const endpoint = createAgentCardServiceEndpoint(
      "did:web:example.com",
      "https://example.com/.well-known/agent.json",
    )

    expect(endpoint).toEqual({
      id: "did:web:example.com#agent-card",
      type: "AgentCard",
      serviceEndpoint: "https://example.com/.well-known/agent.json",
    })
  })

  it("handles DIDs with colon-separated path components", () => {
    const endpoint = createAgentCardServiceEndpoint(
      "did:web:example.com:agents:my-agent",
      "https://example.com/agents/my-agent/agent.json",
    )

    expect(endpoint.id).toBe("did:web:example.com:agents:my-agent#agent-card")
  })
})
