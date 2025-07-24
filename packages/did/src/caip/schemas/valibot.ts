import * as v from "valibot"
import {
  CAIP10_ACCOUNT_ID_PATTERN,
  CAIP19_ASSET_ID_PATTERN,
  CAIP19_ASSET_NAME_PATTERN,
  CAIP19_ASSET_TYPE_PATTERN,
  CAIP2_CHAIN_ID_PATTERN
} from "./core"

export const caip2ChainIdSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^${CAIP2_CHAIN_ID_PATTERN}$`)),
  v.custom<`${string}:${string}`>(() => true)
)

export type Caip2ChainId = v.InferOutput<typeof caip2ChainIdSchema>

export const caip10AccountIdSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^${CAIP10_ACCOUNT_ID_PATTERN}$`)),
  v.custom<`${Caip2ChainId}:${string}`>(() => true)
)

export type Caip10AccountId = v.InferOutput<typeof caip10AccountIdSchema>

export const caip19AssetNameSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^${CAIP19_ASSET_NAME_PATTERN}$`)),
  v.custom<`${string}:${string}`>(() => true)
)

export type Caip19AssetName = v.InferOutput<typeof caip19AssetNameSchema>

export const caip19AssetTypeSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^${CAIP19_ASSET_TYPE_PATTERN}$`)),
  v.custom<`${Caip2ChainId}/${Caip19AssetName}`>(() => true)
)

export type Caip19AssetType = v.InferOutput<typeof caip19AssetTypeSchema>

export const caip19AssetIdSchema = v.pipe(
  v.string(),
  v.regex(new RegExp(`^${CAIP19_ASSET_ID_PATTERN}$`)),
  v.custom<`${Caip2ChainId}/${Caip19AssetName}/${string}`>(() => true)
)

export type Caip19AssetId = v.InferOutput<typeof caip19AssetIdSchema>
