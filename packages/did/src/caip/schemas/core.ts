/**
 * CAIP Schema Patterns
 *
 * Core regex patterns for CAIP specifications that can be composed
 * to build more complex CAIP schemas across validation libraries.
 *
 * @see {@link https://github.com/ChainAgnostic/CAIPs}
 */

/**
 * CAIP-2 Spec - Chain ID Components
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md}
 *
 * chain_id:    namespace + ":" + reference
 * namespace:   [a-z0-9]{3,8}
 * reference:   [-_a-zA-Z0-9]{1,32}
 */

/**
 * CAIP-2 namespace pattern: [a-z0-9]{3,8}
 * @example "eip155", "solana", "cosmos"
 */
export const CAIP2_NAMESPACE_PATTERN = "[a-z0-9]{3,8}"

/**
 * CAIP-2 reference pattern: [-_a-zA-Z0-9]{1,32}
 * @example "1", "11155111", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
 */
export const CAIP2_REFERENCE_PATTERN = "[-_a-zA-Z0-9]{1,32}"

/**
 * CAIP-2 chain_id pattern: namespace + ":" + reference
 * @example "eip155:1", "eip155:11155111", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
 */
export const CAIP2_CHAIN_ID_PATTERN = `${CAIP2_NAMESPACE_PATTERN}:${CAIP2_REFERENCE_PATTERN}`

/**
 * CAIP-10 Spec - Account ID Components
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md}
 *
 * account_id:        chain_id + ":" + account_address
 * chain_id:          [-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32} (See CAIP-2)
 * account_address:   [-.%a-zA-Z0-9]{1,128}
 */

/**
 * CAIP-10 account_address pattern: [-.%a-zA-Z0-9]{1,128}
 * @example "0x1234567890123456789012345678901234567890", "FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
 */
export const CAIP10_ACCOUNT_ADDRESS_PATTERN = "[-.%a-zA-Z0-9]{1,128}"

/**
 * CAIP-10 account_id pattern: chain_id + ":" + account_address
 * @example "eip155:1:0x1234567890123456789012345678901234567890", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FNoGHiv7DKPLXHfuhiEWpJ8qYitawGkuaYwfYkuvFk1P"
 */
export const CAIP10_ACCOUNT_ID_PATTERN = `${CAIP2_CHAIN_ID_PATTERN}:${CAIP10_ACCOUNT_ADDRESS_PATTERN}`

/**
 * CAIP-19 Spec - Asset Identification Components
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md}
 *
 * asset_name:        asset_namespace + ":" + asset_reference
 * asset_type:        chain_id + "/" + asset_name
 * asset_id:          asset_type + "/" + token_id
 *
 * asset_namespace:   [-a-z0-9]{3,8}
 * asset_reference:   [-.%a-zA-Z0-9]{1,128}
 * token_id:          [-.%a-zA-Z0-9]{1,78}
 */

/**
 * CAIP-19 asset_namespace pattern: [-a-z0-9]{3,8}
 * @example "erc20", "erc721", "spl"
 */
export const CAIP19_ASSET_NAMESPACE_PATTERN = "[-a-z0-9]{3,8}"

/**
 * CAIP-19 asset_reference pattern: [-.%a-zA-Z0-9]{1,128}
 * @example "0xA0b86a33E6441e6e80A7C1A00000000001", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 */
export const CAIP19_ASSET_REFERENCE_PATTERN = "[-.%a-zA-Z0-9]{1,128}"

/**
 * CAIP-19 asset_name pattern: asset_namespace + ":" + asset_reference
 * @example "erc20:0xA0b86a33E6441e6e80A7C1A00000000001", "spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 */
export const CAIP19_ASSET_NAME_PATTERN = `${CAIP19_ASSET_NAMESPACE_PATTERN}:${CAIP19_ASSET_REFERENCE_PATTERN}`

/**
 * CAIP-19 asset_type pattern: chain_id + "/" + asset_name
 * @example "eip155:1/erc20:0xA0b86a33E6441e6e80A7C1A00000000001", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 */
export const CAIP19_ASSET_TYPE_PATTERN = `${CAIP2_CHAIN_ID_PATTERN}/${CAIP19_ASSET_NAME_PATTERN}`

/**
 * CAIP-19 token_id pattern: [-.%a-zA-Z0-9]{1,78}
 * @example "1", "42", "CryptoPunk.3100"
 */
export const CAIP19_TOKEN_ID_PATTERN = "[-.%a-zA-Z0-9]{1,78}"

/**
 * CAIP-19 asset_id pattern: asset_type + "/" + token_id
 * @example "eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1", "eip155:1/erc721:0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB/42"
 */
export const CAIP19_ASSET_ID_PATTERN = `${CAIP19_ASSET_TYPE_PATTERN}/${CAIP19_TOKEN_ID_PATTERN}`
