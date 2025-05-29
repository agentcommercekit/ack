/* eslint-disable @cspell/spellchecker */
import * as v from "valibot"
import { createDidDocumentFromKeypair } from "../create-did-document"
import { didPkhChainIdSchema } from "../schemas/valibot"
import type { DidUri } from "../did-uri"
import type { DidUriWithDocument } from "../types"
import type { Keypair } from "@agentcommercekit/keys"

/**
 * Methods for creating and verifying did:pkh documents
 *
 * @see {@link https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md}
 */

/**
 * The `did:pkh` Uri type
 */
export type DidPkhChainId = v.InferOutput<typeof didPkhChainIdSchema>
export type DidPkhUri = `did:pkh:${DidPkhChainId}:${string}`

/**
 * Checks if a given string is a valid CAIP-2 chain ID (`namespace:reference`)
 * chain_id:    namespace + ":" + reference
 * namespace:   [-a-z0-9]{3,8}
 * reference:   [-_a-zA-Z0-9]{1,32}
 *
 * @param chainId - The chain ID to check
 * @returns `true` if the chain ID is a valid CAIP-2 chain ID, `false` otherwise
 */
export function isDidPkhChainId(chainId: unknown): chainId is DidPkhChainId {
  return v.is(didPkhChainIdSchema, chainId)
}

/**
 * Parse a did:pkh URI into its components.
 *
 * This method validates that the URI is a valid did:pkh URI, contains all the
 * required parts, and that the chainId is a valid CAIP-2 chain ID.
 *
 * @param didUri - The did:pkh URI to parse
 * @returns The components of the did:pkh URI
 */
export function didPkhParts(
  didUri: unknown
): ["did", "pkh", string, string, string] {
  if (typeof didUri !== "string" || !didUri.startsWith("did:pkh:")) {
    throw new Error("Invalid did:pkh URI")
  }

  const [did, method, chainNamespace, chainReference, ...rest] =
    didUri.split(":")

  // Build the address from the remaining parts
  const address = rest.join(":")

  if (
    did !== "did" ||
    method !== "pkh" ||
    !chainNamespace?.length ||
    !chainReference?.length ||
    !address.length
  ) {
    throw new Error("Invalid did:pkh URI")
  }

  if (!isDidPkhChainId(`${chainNamespace}:${chainReference}`)) {
    throw new Error("Invalid did:pkh URI")
  }

  return [did, method, chainNamespace, chainReference, address]
}

/**
 * Checks if a given string is a valid did:pkh URI
 *
 * @param didUri - The did:pkh URI to check
 * @returns `true` if the value is a did:pkh URI, `false` otherwise
 */
export function isDidPkhUri(didUri: unknown): didUri is DidPkhUri {
  try {
    didPkhParts(didUri)
    return true
  } catch (_error) {
    return false
  }
}

/**
 * Returns an address from a did:pkh URI, taking into account the chainId
 * for the address format.
 *
 * @example
 * ```ts
 * const address = getAddressFromDidPkhUri("did:pkh:eip155:1:0x1234567890123456789012345678901234567890")
 * // 0x1234567890123456789012345678901234567890
 *
 * const address = getAddressFromDidPkhUri("did:pkh:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P")
 * // FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P
 * ```
 *
 * @param didUri - The did:pkh URI to get the address from
 * @returns The address extracted from the did:pkh URI
 */
export function addressFromDidPkhUri(didUri: string): string {
  const [_did, _method, _chainNamespace, _chainId, address] =
    didPkhParts(didUri)

  return address
}

/**
 * The CAIP-2 chain ID for select networks
 *
 * @see {@link https://chainagnostic.org/CAIPs/caip-2}
 */
export const didPkhChainIds = {
  evm: {
    mainnet: "eip155:1",
    sepolia: "eip155:11155111",
    base: "eip155:8453",
    baseSepolia: "eip155:84532",
    arbitrum: "eip155:42161",
    arbitrumSepolia: "eip155:421614"
  },
  svm: {
    mainnet: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    devnet: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
  }
} as const

/**
 * Create a blockchain account ID
 *
 * @param address - The address to create the blockchain account ID for
 * @param chainId - The CAIP-2 chain ID (e.g. `eip155:1`, `solana`) for this address
 * @returns The blockchain account ID
 */
export function createBlockchainAccountId(
  address: string,
  chainId: DidPkhChainId
): `${DidPkhChainId}:${string}` {
  return `${chainId}:${address}`
}

/**
 * Create a did:pkh URI
 *
 * @param address - The address to create the did:pkh URI for
 * @param chainId - The full CAIP-2 chain ID (e.g. `eip155:1`, `solana`)
 * @returns The did:pkh URI
 *
 * @example
 * ```ts
 * const did = createDidPkhUri("0x1234567890123456789012345678901234567890", "eip155:1")
 * // did:pkh:eip155:1:0x1234567890123456789012345678901234567890
 *
 * const did = createDidPkhUri("FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P", "solana")
 * // did:pkh:solana:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P
 * ```
 */
export function createDidPkhUri(
  address: string,
  chainId: DidPkhChainId
): DidUri {
  return `did:pkh:${createBlockchainAccountId(address, chainId)}`
}

interface CreateDidPkhDocumentOptions {
  keypair: Keypair
  address: string
  chainId: DidPkhChainId
  controller?: DidUri
}

/**
 * Create a did:pkh document
 *
 * @param keypair - The keypair to create the did:pkh document for
 * @param chainId - The CAIP-2 chain ID (e.g. `eip155:1`, `solana`) for this address
 * @param controller - The controller of the did:pkh document
 * @returns The did:pkh document
 */
export function createDidPkhDocument({
  keypair,
  address,
  chainId,
  controller
}: CreateDidPkhDocumentOptions): DidUriWithDocument {
  // Validate that the keypair algorithm matches the chain
  const algorithm = chainId.startsWith("solana") ? "Ed25519" : "secp256k1"
  if (keypair.algorithm !== algorithm) {
    throw new Error(
      `Invalid keypair algorithm. Expected ${algorithm} for chain ${chainId}`
    )
  }

  const blockchainAccountId = createBlockchainAccountId(address, chainId)
  const did = createDidPkhUri(address, chainId)

  const additionalContexts =
    algorithm === "secp256k1"
      ? [
          "https://identity.foundation/EcdsaSecp256k1RecoverySignature2020#EcdsaSecp256k1RecoveryMethod2020",
          "https://w3id.org/security#blockchainAccountId"
        ]
      : [
          "https://w3id.org/security#publicKeyJwk",
          "https://w3id.org/security#blockchainAccountId"
        ]

  if (algorithm === "secp256k1") {
    const didDocument = createDidDocumentFromKeypair({
      did,
      keypair,
      controller,
      encoding: "hex",
      additionalContexts,
      verificationMethod: {
        id: `${did}#blockchainAccountId`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: did,
        blockchainAccountId
      }
    })

    return { did, didDocument }
  }

  const didDocument = createDidDocumentFromKeypair({
    did,
    keypair,
    controller,
    encoding: "jwk",
    additionalContexts
  })

  // Add blockchain account ID to the verification method
  if (didDocument.verificationMethod?.[0]) {
    didDocument.verificationMethod[0].blockchainAccountId = blockchainAccountId
  }

  return { did, didDocument }
}
