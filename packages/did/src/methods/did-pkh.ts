/* eslint-disable @cspell/spellchecker */
import { caip10Parts, createCaip10AccountId } from "@agentcommercekit/caip"
import {
  isCaip10AccountId,
  isCaip2ChainId
} from "@agentcommercekit/caip/schemas/valibot"
import {
  base58ToBytes,
  isBase58,
  publicKeyBytesToJwk
} from "@agentcommercekit/keys/encoding"
import { createDidDocument } from "../create-did-document"
import type { DidUri } from "../did-uri"
import type { DidUriWithDocument } from "../types"
import type { Caip10AccountId, Caip2ChainId } from "@agentcommercekit/caip"
import type { VerificationMethod } from "did-resolver"

/**
 * Methods for creating and verifying did:pkh documents
 *
 * @see {@link https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md}
 */

/**
 * @deprecated Use `Caip2ChainId` instead
 */
export type DidPkhChainId = Caip2ChainId

/**
 * The `did:pkh` Uri type
 */
export type DidPkhUri = DidUri<"pkh", Caip10AccountId>

/**
 * @deprecated Use `isCaip2ChainId` instead
 */
export const isDidPkhChainId = isCaip2ChainId

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

  if (!isCaip2ChainId(`${chainNamespace}:${chainReference}`)) {
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

export function caip10AccountIdFromDidPkhUri(
  didUri: DidPkhUri
): Caip10AccountId {
  const caip10AccountId = didUri.replace("did:pkh:", "")
  if (!isCaip10AccountId(caip10AccountId)) {
    throw new Error("Invalid did:pkh URI")
  }
  return caip10AccountId
}

/**
 * @deprecated Use `createCaip10AccountId` instead
 */
export function createBlockchainAccountId(
  address: string,
  chainId: Caip2ChainId
) {
  return createCaip10AccountId(chainId, address)
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
  chainId: Caip2ChainId,
  address: string
): DidUri {
  return `did:pkh:${createCaip10AccountId(chainId, address)}`
}

/**
 * Create a did:pkh URI from a CAIP-10 account ID
 */
export function createDidPkhUriFromCaip10AccountId(
  caip10AccountId: Caip10AccountId
): DidUri {
  return `did:pkh:${caip10AccountId}`
}

const jsonLdContexts = {
  Ed25519VerificationKey2020: [
    "https://w3id.org/security#blockchainAccountId",
    "https://w3id.org/security#publicKeyJwk",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  EcdsaSecp256k1RecoveryMethod2020: [
    "https://w3id.org/security#blockchainAccountId",
    "https://identity.foundation/EcdsaSecp256k1RecoverySignature2020#EcdsaSecp256k1RecoveryMethod2020"
  ]
}

/**
 * Create a did:pkh document from a CAIP-10 account ID
 *
 * @example
 * ```ts
 * const didDocument = createDidPkhDocumentFromCaip10AccountId(
 *   "eip155:1:0x1234567890123456789012345678901234567890",
 *   "did:example:123"
 * )
 * ```
 *
 * @param caip10AccountId - The CAIP-10 account ID
 * @param controller - The controller of the did:pkh document
 * @returns The did:pkh document
 */
export function createDidPkhDocumentFromCaip10AccountId(
  caip10AccountId: Caip10AccountId,
  controller?: DidUri
): DidUriWithDocument {
  const did = createDidPkhUriFromCaip10AccountId(caip10AccountId)
  const verificationMethod = createVerificationMethod(did, caip10AccountId)
  const additionalContexts = jsonLdContexts[verificationMethod.type]

  const didDocument = createDidDocument({
    did,
    controller,
    additionalContexts,
    verificationMethod,
    capabilityDelegation: [verificationMethod.id],
    capabilityInvocation: [verificationMethod.id]
  })

  return { did, didDocument }
}

interface CreateDidPkhDocumentOptions {
  address: string
  chainId: Caip2ChainId
  controller?: DidUri
}

/**
 * Create a did:pkh document
 * @returns The did:pkh document
 */
export function createDidPkhDocument({
  address,
  chainId,
  controller
}: CreateDidPkhDocumentOptions): DidUriWithDocument {
  const caip10AccountId = createCaip10AccountId(chainId, address)
  return createDidPkhDocumentFromCaip10AccountId(caip10AccountId, controller)
}

/**
 * Create a verification method for a did:pkh document
 * @param did - The did:pkh URI
 * @param caip10AccountId - The CAIP-10 account ID
 * @returns The verification method
 */
function createVerificationMethod(
  did: DidUri,
  caip10AccountId: Caip10AccountId
): Omit<VerificationMethod, "type"> & {
  type: "Ed25519VerificationKey2020" | "EcdsaSecp256k1RecoveryMethod2020"
} {
  const { namespace, accountId } = caip10Parts(caip10AccountId)

  if (namespace.startsWith("solana") && isBase58(accountId)) {
    const publicKeyJwk = publicKeyBytesToJwk(
      base58ToBytes(accountId),
      "Ed25519"
    )
    return {
      id: `${did}#controller`,
      type: "Ed25519VerificationKey2020",
      controller: did,
      blockchainAccountId: caip10AccountId,
      publicKeyJwk
    }
  }

  // Fall back to secp256k1
  return {
    id: `${did}#blockchainAccountId`,
    type: "EcdsaSecp256k1RecoveryMethod2020",
    controller: did,
    blockchainAccountId: caip10AccountId
  }
}
