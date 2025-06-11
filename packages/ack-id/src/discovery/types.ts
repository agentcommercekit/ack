import type { DidUri } from "@agentcommercekit/did"

/**
 * Agent capabilities and attributes for discovery
 */
export interface AgentCapabilities {
  /** List of supported protocols */
  protocols: string[]
  /** List of supported service types */
  serviceTypes: string[]
  /** Custom attributes for filtering */
  attributes: Record<string, string>
}

/**
 * Agent registration data
 */
export interface AgentRegistration {
  /** Agent's DID */
  did: DidUri
  /** Agent capabilities */
  capabilities: AgentCapabilities
  /** Registration timestamp */
  timestamp: number
  /** Optional expiration timestamp */
  expiresAt?: number
}

/**
 * Query filters for discovering agents
 */
export interface DiscoveryFilter {
  /** Required protocols */
  protocols?: string[]
  /** Required service types */
  serviceTypes?: string[]
  /** Required attributes */
  attributes?: Record<string, string>
}

/**
 * Discovery query options
 */
export interface DiscoveryOptions {
  /** Maximum number of results */
  limit?: number
  /** Pagination token */
  after?: string
  /** Include expired registrations */
  includeExpired?: boolean
}

/**
 * Discovery query response
 */
export interface DiscoveryResponse {
  /** Found agents */
  agents: AgentRegistration[]
  /** Next page token */
  nextPage?: string
  /** Total number of matching agents */
  total: number
}

/**
 * Interface for agent discovery service
 */
export interface AgentDiscoveryService {
  /**
   * Register an agent with the discovery service
   * @param registration Agent registration data
   */
  register(registration: AgentRegistration): Promise<void>

  /**
   * Update an agent's registration
   * @param did Agent's DID
   * @param registration Updated registration data
   */
  update(did: DidUri, registration: Partial<AgentRegistration>): Promise<void>

  /**
   * Deregister an agent from the discovery service
   * @param did Agent's DID
   */
  deregister(did: DidUri): Promise<void>

  /**
   * Discover agents matching the given filters
   * @param filter Discovery filters
   * @param options Query options
   */
  discover(
    filter: DiscoveryFilter,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResponse>

  /**
   * Get a specific agent's registration
   * @param did Agent's DID
   */
  get(did: DidUri): Promise<AgentRegistration | undefined>
}
