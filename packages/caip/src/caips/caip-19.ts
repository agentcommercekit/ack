import { caip2ChainIdPattern, type Caip2ChainId } from "./caip-2"

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

export type Caip19AssetName = `${string}:${string}` // asset_namespace:asset_reference
export type Caip19AssetType = `${Caip2ChainId}/${Caip19AssetName}` // chain_id/asset_name
export type Caip19AssetId = `${Caip19AssetType}/${string}` // asset_type/token_id

export const caip19AssetNamespacePattern = "[-a-z0-9]{3,8}"
export const caip19AssetReferencePattern = "[-.%a-zA-Z0-9]{1,128}"
export const caip19AssetNamePattern = `${caip19AssetNamespacePattern}:${caip19AssetReferencePattern}`
export const caip19AssetTypePattern = `${caip2ChainIdPattern}/${caip19AssetNamePattern}`
export const caip19TokenIdPattern = "[-.%a-zA-Z0-9]{1,78}"
export const caip19AssetIdPattern = `${caip19AssetTypePattern}/${caip19TokenIdPattern}`

export const caip19AssetNamespaceRegex = new RegExp(
  `^${caip19AssetNamespacePattern}$`,
)
export const caip19AssetReferenceRegex = new RegExp(
  `^${caip19AssetReferencePattern}$`,
)
export const caip19AssetNameRegex = new RegExp(`^${caip19AssetNamePattern}$`)
export const caip19AssetTypeRegex = new RegExp(`^${caip19AssetTypePattern}$`)
export const caip19TokenIdRegex = new RegExp(`^${caip19TokenIdPattern}$`)
export const caip19AssetIdRegex = new RegExp(`^${caip19AssetIdPattern}$`)
