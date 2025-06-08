import { didUriSchema } from "@agentcommercekit/did/schemas/zod"
import { z } from "zod"

/**
 * Schema for agent capabilities
 */
export const agentCapabilitiesSchema = z.object({
  protocols: z.array(z.string()),
  serviceTypes: z.array(z.string()),
  attributes: z.record(z.string(), z.unknown())
})

/**
 * Schema for agent registration
 */
export const agentRegistrationSchema = z.object({
  did: didUriSchema,
  capabilities: agentCapabilitiesSchema,
  timestamp: z.number(),
  expiresAt: z.number().optional()
})

/**
 * Schema for discovery filter
 */
export const discoveryFilterSchema = z.object({
  protocols: z.array(z.string()).optional(),
  serviceTypes: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional()
})

/**
 * Schema for discovery options
 */
export const discoveryOptionsSchema = z.object({
  limit: z.number().optional(),
  after: z.string().optional(),
  includeExpired: z.boolean().optional()
})

/**
 * Schema for discovery response
 */
export const discoveryResponseSchema = z.object({
  agents: z.array(agentRegistrationSchema),
  nextPage: z.string().optional(),
  total: z.number()
})
