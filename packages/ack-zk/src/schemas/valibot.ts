import * as v from "valibot"

// Re-export the controller claim schema from ack-id
export { controllerClaimSchema } from "@agentcommercekit/ack-id/schemas/valibot"

// Schema for ZK proof public values (must match Rust output)
export const zkPublicValuesSchema = v.object({
  agentDidHash: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/i)),
  controllerCommitment: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/i)),
  hasValidController: v.boolean(),
  credentialTimestamp: v.number(),
  isExpired: v.boolean()
})

// Schema for the complete ZK proof
export const zkControllerProofSchema = v.object({
  proof: v.string(), // Hex-encoded proof data
  publicValues: zkPublicValuesSchema
})