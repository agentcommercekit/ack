/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// This rule is disabled because TypeScript's type inference is too strict here.
// The rule incorrectly flags our null checks and array length checks as unnecessary,
// even though they're needed for runtime safety and code clarity.
import type {
  AgentDiscoveryService,
  AgentRegistration,
  DiscoveryFilter,
  DiscoveryOptions,
  DiscoveryResponse
} from "./types"
import type { DidUri } from "@agentcommercekit/did"

/**
 * Base class for implementing agent discovery services
 */
export abstract class BaseDiscoveryService implements AgentDiscoveryService {
  /**
   * Register an agent with the discovery service
   */
  abstract register(registration: AgentRegistration): Promise<void>

  /**
   * Update an agent's registration
   */
  abstract update(
    did: DidUri,
    registration: Partial<AgentRegistration>
  ): Promise<void>

  /**
   * Deregister an agent from the discovery service
   */
  abstract deregister(did: DidUri): Promise<void>

  /**
   * Get a specific agent's registration
   */
  abstract get(did: DidUri): Promise<AgentRegistration | undefined>

  /**
   * Discover agents matching the given filters
   */
  abstract discover(
    filter: DiscoveryFilter,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResponse>

  /**
   * Check if an agent matches the given filter
   */
  protected matchesFilter(
    agent: AgentRegistration,
    filter: DiscoveryFilter
  ): boolean {
    // Check protocols
    const protocols = filter.protocols ?? []
    if (!protocols.every((p) => agent.capabilities.protocols.includes(p))) {
      return false
    }

    // Check service types
    const serviceTypes = filter.serviceTypes ?? []
    if (
      !serviceTypes.every((s) => agent.capabilities.serviceTypes.includes(s))
    ) {
      return false
    }

    // Check attributes
    const attributes = filter.attributes ?? {}
    return Object.entries(attributes).every(
      ([key, value]) => agent.capabilities.attributes[key] === value
    )
  }

  /**
   * Check if an agent registration has expired
   */
  protected isExpired(agent: AgentRegistration): boolean {
    return Date.now() > (agent.expiresAt ?? Number.MAX_SAFE_INTEGER)
  }

  /**
   * Validate agent registration data
   */
  protected validateRegistration(registration: AgentRegistration): void {
    // Ensure timestamp is present
    registration.timestamp = registration.timestamp || Date.now()

    // Ensure capabilities are present
    if (!registration.capabilities) {
      throw new Error("Agent capabilities are required")
    }

    // Initialize capabilities if not present
    registration.capabilities.protocols =
      registration.capabilities.protocols ?? []
    registration.capabilities.serviceTypes =
      registration.capabilities.serviceTypes ?? []
    registration.capabilities.attributes =
      registration.capabilities.attributes ?? {}
  }
}
