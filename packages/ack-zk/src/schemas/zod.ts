import { z } from "zod"

// Re-export the controller claim schema from ack-id
export { controllerClaimSchema } from "@agentcommercekit/ack-id/schemas/zod"

// Schema for ZK proof public values (must match Rust output)
export const zkPublicValuesSchema = z.object({
  agentDidHash: z.string().regex(/^[0-9a-f]{64}$/i),
  controllerCommitment: z.string().regex(/^[0-9a-f]{64}$/i),
  hasValidController: z.boolean(),
  credentialTimestamp: z.number(),
  isExpired: z.boolean()
})

// Schema for the complete ZK proof
export const zkControllerProofSchema = z.object({
  proof: z.string(), // Hex-encoded proof data
  publicValues: zkPublicValuesSchema
})