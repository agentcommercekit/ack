import { caip2ChainIdSchema } from "@agentcommercekit/caip/schemas/valibot"
import * as v from "valibot"
import { isDidUri, type DidUri } from "../did-uri"

export const didUriSchema = v.custom<DidUri>(isDidUri, "Invalid DID format")

/**
 * @deprecated Use `caip2ChainIdSchema` instead
 */
export const didPkhChainIdSchema = caip2ChainIdSchema
