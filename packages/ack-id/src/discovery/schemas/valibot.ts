import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import {
  array,
  boolean,
  number,
  object,
  optional,
  record,
  string,
  unknown
} from "valibot"

/**
 * Schema for agent capabilities
 */
export const agentCapabilitiesSchema = object({
  protocols: array(string()),
  serviceTypes: array(string()),
  attributes: record(string(), string())
})

/**
 * Schema for agent registration
 */
export const agentRegistrationSchema = object({
  did: didUriSchema,
  capabilities: agentCapabilitiesSchema,
  timestamp: number(),
  expiresAt: optional(number())
})

/**
 * Schema for discovery filter
 */
export const discoveryFilterSchema = object({
  protocols: optional(array(string())),
  serviceTypes: optional(array(string())),
  attributes: optional(record(string(), string()))
})

/**
 * Schema for discovery options
 */
export const discoveryOptionsSchema = object({
  limit: optional(number()),
  after: optional(string()),
  includeExpired: optional(string())
})

/**
 * Schema for discovery response
 */
export const discoveryResponseSchema = object({
  agents: array(agentRegistrationSchema),
  nextPage: optional(string()),
  total: number()
})
