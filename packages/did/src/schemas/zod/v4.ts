import * as z from "zod/v4"

import { isDidUri, type DidUri } from "../../did-uri"

export const didUriSchema = z.custom<DidUri>(isDidUri, "Invalid DID format")
