import * as v from "valibot"
import {
  caip2ChainIdRegex,
  caip10AccountIdRegex,
  caip19AssetIdRegex,
  caip19AssetNameRegex,
  caip19AssetTypeRegex,
  type Caip2ChainId,
  type Caip10AccountId,
  type Caip19AssetId,
  type Caip19AssetName,
  type Caip19AssetType
} from "../caips"

export const caip2ChainIdSchema = v.pipe(
  v.string(),
  v.regex(caip2ChainIdRegex),
  v.custom<Caip2ChainId>(() => true)
)

export function isCaip2ChainId(chainId: unknown): chainId is Caip2ChainId {
  return v.is(caip2ChainIdSchema, chainId)
}

export const caip10AccountIdSchema = v.pipe(
  v.string(),
  v.regex(caip10AccountIdRegex),
  v.custom<Caip10AccountId>(() => true)
)

export function isCaip10AccountId(
  accountId: unknown
): accountId is Caip10AccountId {
  return v.is(caip10AccountIdSchema, accountId)
}

export const caip19AssetNameSchema = v.pipe(
  v.string(),
  v.regex(caip19AssetNameRegex),
  v.custom<Caip19AssetName>(() => true)
)

export function isCaip19AssetName(
  assetName: unknown
): assetName is Caip19AssetName {
  return v.is(caip19AssetNameSchema, assetName)
}

export const caip19AssetTypeSchema = v.pipe(
  v.string(),
  v.regex(caip19AssetTypeRegex),
  v.custom<Caip19AssetType>(() => true)
)

export function isCaip19AssetType(
  assetType: unknown
): assetType is Caip19AssetType {
  return v.is(caip19AssetTypeSchema, assetType)
}

export const caip19AssetIdSchema = v.pipe(
  v.string(),
  v.regex(caip19AssetIdRegex),
  v.custom<Caip19AssetId>(() => true)
)

export function isCaip19AssetId(assetId: unknown): assetId is Caip19AssetId {
  return v.is(caip19AssetIdSchema, assetId)
}
