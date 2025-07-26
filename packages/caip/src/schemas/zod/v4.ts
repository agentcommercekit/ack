import * as z from "zod/v4"
import {
  caip10AccountIdRegex,
  caip19AssetIdRegex,
  caip19AssetNameRegex,
  caip19AssetTypeRegex,
  caip2ChainIdRegex
} from "../../caips"
import type {
  Caip10AccountId,
  Caip19AssetId,
  Caip19AssetName,
  Caip19AssetType,
  Caip2ChainId
} from "../../caips"

export const caip2ChainIdSchema = z
  .string()
  .regex(caip2ChainIdRegex)
  .pipe(z.custom<Caip2ChainId>(() => true))

export function isCaip2ChainId(chainId: unknown): chainId is Caip2ChainId {
  return caip2ChainIdSchema.safeParse(chainId).success
}

export const caip10AccountIdSchema = z
  .string()
  .regex(caip10AccountIdRegex)
  .pipe(z.custom<Caip10AccountId>(() => true))

export function isCaip10AccountId(
  accountId: unknown
): accountId is Caip10AccountId {
  return caip10AccountIdSchema.safeParse(accountId).success
}

export const caip19AssetNameSchema = z
  .string()
  .regex(caip19AssetNameRegex)
  .pipe(z.custom<Caip19AssetName>(() => true))

export function isCaip19AssetName(
  assetName: unknown
): assetName is Caip19AssetName {
  return caip19AssetNameSchema.safeParse(assetName).success
}

export const caip19AssetTypeSchema = z
  .string()
  .regex(caip19AssetTypeRegex)
  .pipe(z.custom<Caip19AssetType>(() => true))

export function isCaip19AssetType(
  assetType: unknown
): assetType is Caip19AssetType {
  return caip19AssetTypeSchema.safeParse(assetType).success
}

export const caip19AssetIdSchema = z
  .string()
  .regex(caip19AssetIdRegex)
  .pipe(z.custom<Caip19AssetId>(() => true))

export function isCaip19AssetId(assetId: unknown): assetId is Caip19AssetId {
  return caip19AssetIdSchema.safeParse(assetId).success
}
