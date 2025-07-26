/* eslint-disable @cspell/spellchecker */
/**
 * CAIP-2 Spec - Chain ID Components
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md}
 *
 * chain_id:    namespace + ":" + reference
 * namespace:   [a-z0-9]{3,8}
 * reference:   [-_a-zA-Z0-9]{1,32}
 */

export type Caip2ChainId = `${string}:${string}`
export type Caip2ChainIdParts = {
  namespace: string
  reference: string
}

export const caip2NamespacePattern = "[a-z0-9]{3,8}"
export const caip2ReferencePattern = "[-_a-zA-Z0-9]{1,32}"
export const caip2ChainIdPattern = `${caip2NamespacePattern}:${caip2ReferencePattern}`

export const caip2NamespaceRegex = new RegExp(`^${caip2NamespacePattern}$`)
export const caip2ReferenceRegex = new RegExp(`^${caip2ReferencePattern}$`)
export const caip2ChainIdRegex = new RegExp(`^${caip2ChainIdPattern}$`)

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

export function caip2Parts(caip: Caip2ChainId): Caip2ChainIdParts {
  const [namespace, reference] = caip.split(":")

  if (!namespace || !reference) {
    throw new Error("Invalid CAIP-2 chain ID")
  }

  return { namespace, reference }
}
