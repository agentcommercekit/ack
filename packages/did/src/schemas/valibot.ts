import { DidSchema } from "web-identity-schemas/valibot"

/**
 * Validates a DID URI, backed by `web-identity-schemas`' DID-core schema.
 */
export const didUriSchema = DidSchema
