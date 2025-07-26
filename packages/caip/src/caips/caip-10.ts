import { caip2ChainIdPattern } from "./caip-2"
import type { Caip2ChainId, Caip2ChainIdParts } from "./caip-2"

/**
 * CAIP-10 Spec - Account ID Components
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md}
 *
 * account_id:        chain_id + ":" + account_address
 * chain_id:          [-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32} (See CAIP-2)
 * account_address:   [-.%a-zA-Z0-9]{1,128}
 */

export type Caip10AccountId = `${Caip2ChainId}:${string}`
export type Caip10AccountIdParts = Caip2ChainIdParts & {
  accountId: string
}

export const caip10AccountAddressPattern = "[-.%a-zA-Z0-9]{1,128}"
export const caip10AccountIdPattern = `${caip2ChainIdPattern}:${caip10AccountAddressPattern}`

export const caip10AccountAddressRegex = new RegExp(
  `^${caip10AccountAddressPattern}$`
)
export const caip10AccountIdRegex = new RegExp(`^${caip10AccountIdPattern}$`)

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

export function caip10Parts(caip: Caip10AccountId): Caip10AccountIdParts {
  const [namespace, reference, accountId] = caip.split(":")
  if (!namespace || !reference || !accountId) {
    throw new Error("Invalid CAIP-10 account ID")
  }
  return { namespace, reference, accountId }
}
