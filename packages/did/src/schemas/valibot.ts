import * as v from "valibot"

import { isDidUri, type DidUri } from "../did-uri"

export const didUriSchema = v.custom<DidUri>(isDidUri, "Invalid DID format")
