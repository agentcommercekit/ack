import { z } from "zod/v3"
import {
  CAIP10_ACCOUNT_ID_PATTERN,
  CAIP19_ASSET_ID_PATTERN,
  CAIP19_ASSET_NAME_PATTERN,
  CAIP19_ASSET_TYPE_PATTERN,
  CAIP2_CHAIN_ID_PATTERN
} from "../core"

export const caip2ChainIdSchema = z
  .string()
  .regex(new RegExp(`^${CAIP2_CHAIN_ID_PATTERN}$`))

export const caip10AccountIdSchema = z
  .string()
  .regex(new RegExp(`^${CAIP10_ACCOUNT_ID_PATTERN}$`))

export const caip19AssetNameSchema = z
  .string()
  .regex(new RegExp(`^${CAIP19_ASSET_NAME_PATTERN}$`))

export const caip19AssetTypeSchema = z
  .string()
  .regex(new RegExp(`^${CAIP19_ASSET_TYPE_PATTERN}$`))

export const caip19AssetIdSchema = z
  .string()
  .regex(new RegExp(`^${CAIP19_ASSET_ID_PATTERN}$`))
