import { caip2ChainIdSchema } from "@agentcommercekit/caip/schemas/zod"
import { DidSchema } from "web-identity-schemas/zod"

/**
 * Validates a DID URI, backed by `web-identity-schemas`' DID-core schema.
 */
export const didUriSchema = DidSchema

/**
 * @deprecated Use `caip2ChainIdSchema` instead
 */
export const didPkhChainIdSchema = caip2ChainIdSchema
