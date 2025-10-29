export const serviceTypeAgentCard = "AgentCard" as const

export type ServiceTypeAgentCard = typeof serviceTypeAgentCard

export function createAgentCardServiceEndpoint(
  did: string,
  agentCardUrl: string,
) {
  return {
    id: `${did}#agent-card`,
    type: "AgentCard",
    serviceEndpoint: agentCardUrl,
  }
}
