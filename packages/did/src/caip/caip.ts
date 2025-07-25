import * as v from "valibot"
import { caip10AccountIdSchema, caip2ChainIdSchema } from "./schemas/valibot"
import type { Caip10AccountId, Caip2ChainId } from "./types"

/**
 * A set of CAIP-2 chain IDs for select networks
 *
 * @see {@link https://chainagnostic.org/CAIPs/caip-2}
 */
export const caip2ChainIds = {
  ethereumMainnet: "eip155:1",
  ethereumSepolia: "eip155:11155111",
  baseMainnet: "eip155:8453",
  baseSepolia: "eip155:84532",
  arbitrumMainnet: "eip155:42161",
  arbitrumSepolia: "eip155:421614",
  solanaMainnet: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  solanaDevnet: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
} as const

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

/**
 * Checks if a given string is a valid CAIP-10 account ID
 */
export function isCaip10AccountId(
  accountId: unknown
): accountId is Caip10AccountId {
  return v.is(caip10AccountIdSchema, accountId)
}

/**
 * Create a CAIP-10 Account ID
 *
 * @param address - The address to create the CAIP-10 Account ID for
 * @param chainId - The CAIP-2 chain ID (e.g. `eip155:1`, `solana`) for this address
 * @returns The CAIP-10 Account ID
 */
export function createCaip10AccountId(
  chainId: Caip2ChainId,
  address: string
): Caip10AccountId {
  return `${chainId}:${address}`
}

interface Caip2Parts {
  namespace: string
  reference: string
}

interface Caip10Parts extends Caip2Parts {
  accountId: string
}

export function caip2Parts(caip: Caip2ChainId): Caip2Parts {
  const [namespace, reference] = caip.split(":")
  if (!namespace || !reference) {
    throw new Error("Invalid CAIP-2 chain ID")
  }
  return { namespace, reference }
}

export function caip10Parts(caip: Caip10AccountId): Caip10Parts {
  const [namespace, reference, accountId] = caip.split(":")
  if (!namespace || !reference || !accountId) {
    throw new Error("Invalid CAIP-10 account ID")
  }
  return { namespace, reference, accountId }
}
