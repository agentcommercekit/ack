import { z } from "zod/v3"
import { caip2ChainIdSchema } from "../../caip/schemas/zod/v3"
import { isDidUri } from "../../did-uri"
import type { DidUri } from "../../did-uri"

export * from "../../caip/schemas/zod/v3"

export const didUriSchema = z.custom<DidUri>(isDidUri, "Invalid DID format")

/**
 * @deprecated Use `caip2ChainIdSchema` instead
 */
export const didPkhChainIdSchema = caip2ChainIdSchema
