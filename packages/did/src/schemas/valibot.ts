import * as v from "valibot"
import { caip2ChainIdSchema } from "../caip/schemas/valibot"
import { isDidUri } from "../did-uri"
import type { DidUri } from "../did-uri"

export * from "../caip/schemas/valibot"

export const didUriSchema = v.custom<DidUri>(isDidUri, "Invalid DID format")

/**
 * @deprecated Use `caip2ChainIdSchema` instead
 */
export const didPkhChainIdSchema = caip2ChainIdSchema
