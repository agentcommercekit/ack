import { DidSchema } from "web-identity-schemas/zod"

/**
 * Validates a DID URI, backed by `web-identity-schemas`' DID-core schema.
 */
export const didUriSchema = DidSchema
