import { describe, expect, it } from "vitest"

import { createAgentCardServiceEndpoint } from "./service-endpoints"

describe("createAgentCardServiceEndpoint", () => {
  it("creates a service endpoint with correct structure", () => {
    const did = "did:web:example.com"
    const agentCardUrl = "https://example.com/.well-known/agent.json"

    const endpoint = createAgentCardServiceEndpoint(did, agentCardUrl)

    expect(endpoint).toEqual({
      id: "did:web:example.com#agent-card",
      type: "AgentCard",
      serviceEndpoint: "https://example.com/.well-known/agent.json",
    })
  })

  it("appends #agent-card fragment to the DID", () => {
    const did = "did:web:my-agent.example.com"
    const agentCardUrl = "https://my-agent.example.com/agent-card"

    const endpoint = createAgentCardServiceEndpoint(did, agentCardUrl)

    expect(endpoint.id).toBe("did:web:my-agent.example.com#agent-card")
  })

  it("preserves the agent card URL as-is", () => {
    const did = "did:web:example.com"
    const agentCardUrl =
      "https://example.com/agents/my-agent/.well-known/agent.json"

    const endpoint = createAgentCardServiceEndpoint(did, agentCardUrl)

    expect(endpoint.serviceEndpoint).toBe(agentCardUrl)
  })

  it("sets the type to AgentCard", () => {
    const endpoint = createAgentCardServiceEndpoint(
      "did:web:example.com",
      "https://example.com/agent.json",
    )

    expect(endpoint.type).toBe("AgentCard")
  })

  it("handles DIDs with paths", () => {
    const did = "did:web:example.com:agents:my-agent"
    const agentCardUrl = "https://example.com/agents/my-agent/agent.json"

    const endpoint = createAgentCardServiceEndpoint(did, agentCardUrl)

    expect(endpoint.id).toBe(
      "did:web:example.com:agents:my-agent#agent-card",
    )
  })

  it("handles empty strings", () => {
    const endpoint = createAgentCardServiceEndpoint("", "")

    expect(endpoint).toEqual({
      id: "#agent-card",
      type: "AgentCard",
      serviceEndpoint: "",
    })
  })
})
