import { caip2ChainIdSchema } from "@agentcommercekit/caip/schemas/zod/v4"
import * as z from "zod/v4"

import { isDidUri, type DidUri } from "../../did-uri"

export const didUriSchema = z.custom<DidUri>(isDidUri, "Invalid DID format")

/**
 * @deprecated Use `caip2ChainIdSchema` instead
 */
export const didPkhChainIdSchema = caip2ChainIdSchema
