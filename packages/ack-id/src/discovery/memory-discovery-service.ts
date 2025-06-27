import { BaseDiscoveryService } from "./base-discovery-service"
import type {
  AgentRegistration,
  DiscoveryFilter,
  DiscoveryOptions,
  DiscoveryResponse
} from "./types"
import type { DidUri } from "@agentcommercekit/did"

/**
 * In-memory implementation of the agent discovery service
 */
export class MemoryDiscoveryService extends BaseDiscoveryService {
  private agents: Map<string, AgentRegistration>

  constructor() {
    super()
    this.agents = new Map()
  }

  /**
   * Register an agent with the discovery service
   */
  register(registration: AgentRegistration): Promise<void> {
    this.validateRegistration(registration)
    this.agents.set(registration.did, registration)
    return Promise.resolve()
  }

  /**
   * Update an agent's registration
   */
  async update(
    did: DidUri,
    registration: Partial<AgentRegistration>
  ): Promise<void> {
    const existing = await this.get(did)
    if (!existing) {
      throw new Error(`Agent ${did} not found`)
    }

    const updated: AgentRegistration = {
      ...existing,
      ...registration,
      capabilities: {
        protocols:
          registration.capabilities?.protocols ??
          existing.capabilities.protocols,
        serviceTypes:
          registration.capabilities?.serviceTypes ??
          existing.capabilities.serviceTypes,
        attributes: {
          ...existing.capabilities.attributes,
          ...registration.capabilities?.attributes
        }
      }
    }

    this.validateRegistration(updated)
    this.agents.set(did, updated)
  }

  /**
   * Deregister an agent from the discovery service
   */
  deregister(did: DidUri): Promise<void> {
    this.agents.delete(did)
    return Promise.resolve()
  }

  /**
   * Get a specific agent's registration
   */
  get(did: DidUri): Promise<AgentRegistration | undefined> {
    const agent = this.agents.get(did)
    return Promise.resolve(agent ?? undefined)
  }

  /**
   * Discover agents matching the given filters
   */
  discover(
    filter: DiscoveryFilter,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResponse> {
    const { limit = 10, includeExpired = false } = options ?? {}
    const agents = Array.from(this.agents.values())
      .filter((agent) => {
        if (!includeExpired && this.isExpired(agent)) {
          return false
        }
        return this.matchesFilter(agent, filter)
      })
      .slice(0, limit)

    return Promise.resolve({
      agents,
      total: agents.length
    })
  }
}
