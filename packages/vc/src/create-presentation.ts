import type { DidUri } from "@agentcommercekit/did"
import type { Verifiable, W3CCredential, W3CPresentation } from "./types"

export type CreatePresentationParams = {
  /**
   * The ID of the presentation.
   */
  id?: string
  /**
   * The type of the presentation.
   */
  type?: string | string[]
  /**
   * The holder of the presentation.
   */
  holder: DidUri
  /**
   * The credentials to include in the presentation.
   */
  credentials: Verifiable<W3CCredential>[]
  /**
   * The issuance date of the presentation.
   */
  issuanceDate?: Date
  /**
   * The expiration date of the presentation.
   */
  expirationDate?: Date
}

export function createPresentation({
  credentials,
  holder,
  id,
  type,
  issuanceDate,
  expirationDate,
}: CreatePresentationParams): W3CPresentation {
  const credentialTypes = [type]
    .flat()
    .filter((t): t is string => !!t && t !== "VerifiablePresentation")

  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation", ...credentialTypes],
    id,
    holder,
    verifiableCredential: credentials,
    issuanceDate: issuanceDate?.toISOString(),
    expirationDate: expirationDate?.toISOString(),
  }
}
