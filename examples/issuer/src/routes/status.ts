import { notFound } from "@repo/api-utils/exceptions"
import {
  createStatusListCredential,
  parseJwtCredential,
  signCredential,
  type BitstringStatusListCredential,
  type Verifiable,
} from "agentcommercekit"
import { bitstringStatusListClaimSchema } from "agentcommercekit/schemas/valibot"
import { Hono, type Env, type TypedResponse } from "hono"
import { env } from "hono/adapter"
import * as v from "valibot"

import { getStatusList } from "@/db/queries/status-lists"
import { compressBitString } from "@/lib/utils/compress-bit-string"
import { database } from "@/middleware/database"
import { didResolver } from "@/middleware/did-resolver"
import { issuer as issuerMiddleware } from "@/middleware/issuer"

const app = new Hono<Env>()

app.use("*", database())
app.use("*", issuerMiddleware())
app.use("*", didResolver())

/**
 * GET /status/:listId
 *
 * @description Retrieves a BitstringStatusListCredential for checking revocation status
 *
 * URL Parameters:
 * - listId: string - ID of the status list to retrieve
 *
 * @returns Signed BitstringStatusListCredential with compressed bit string
 *
 * The credential is returned bare, not wrapped in this API's `{ ok, data }`
 * envelope: this URL is the `statusListCredential` a verifier dereferences, and
 * the W3C Bitstring Status List spec expects the credential itself at that URL.
 * A wrapped body is not a credential, so verifiers cannot check revocation.
 */
app.get(
  "/:listId",
  async (
    c,
  ): Promise<TypedResponse<Verifiable<BitstringStatusListCredential>>> => {
    const db = c.get("db")
    const issuer = c.get("issuer")
    const resolver = c.get("resolver")
    const { BASE_URL } = env(c)

    // Parse the id before it reaches either the query or the credential id, so
    // `/status/01` and `/status/1abc` cannot sign caller-supplied text into the
    // credential id while selecting the same row.
    const listId = v.safeParse(
      v.pipe(
        v.string(),
        v.regex(/^\d+$/),
        v.transform(Number),
        // A long digit string parses to an unsafe integer or `Infinity`, which
        // would reach the query.
        v.safeInteger(),
        // Status list ids are zero-based: `getStatusListPosition` puts the
        // first 8192 credentials on list 0.
        v.minValue(0),
      ),
      c.req.param("listId"),
    )

    if (!listId.success) {
      return notFound("Status list not found")
    }

    const statusList = await getStatusList(db, listId.output)

    if (!statusList) {
      return notFound("Status list not found")
    }

    const encodedList = compressBitString(statusList.data)

    const credential = createStatusListCredential({
      url: `${BASE_URL}/status/${listId.output}`,
      encodedList,
      issuer: issuer.did,
    })

    const jwt = await signCredential(credential, issuer)

    const parsed = await parseJwtCredential(jwt, resolver)
    const credentialSubject = v.parse(
      bitstringStatusListClaimSchema,
      parsed.credentialSubject,
    )

    const verifiableCredential: Verifiable<BitstringStatusListCredential> = {
      ...parsed,
      credentialSubject,
    }

    return c.json(verifiableCredential)
  },
)

export default app
