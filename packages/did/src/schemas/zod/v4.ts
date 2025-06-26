import * as z from "zod/v4"
import { isDidUri } from "../../did-uri"
import type { DidUri } from "../../did-uri"

export const didUriSchema = z.custom<DidUri>(isDidUri, "Invalid DID format")

export const didPkhChainIdSchema = z
  .string()
  .regex(/^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/)
  .refine((val): val is `${string}:${string}` => true)
