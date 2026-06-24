import { z } from "zod/v3"

import { isDidUri, type DidUri } from "../../did-uri"

export const didUriSchema = z.custom<DidUri>(isDidUri, "Invalid DID format")
