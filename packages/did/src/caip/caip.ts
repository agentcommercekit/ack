import * as v from "valibot"
import { caip2ChainIdSchema } from "./schemas/valibot"
import type { Caip2ChainId } from "./types"

/**
 * Checks if a given string is a valid CAIP-2 chain ID (`namespace:reference`)
 * chain_id:    namespace + ":" + reference
 * namespace:   [-a-z0-9]{3,8}
 * reference:   [-_a-zA-Z0-9]{1,32}
 *
 * @param chainId - The chain ID to check
 * @returns `true` if the chain ID is a valid CAIP-2 chain ID, `false` otherwise
 */
export function isCaip2ChainId(chainId: unknown): chainId is Caip2ChainId {
  return v.is(caip2ChainIdSchema, chainId)
}
