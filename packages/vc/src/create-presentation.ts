import type { Verifiable, W3CCredential, W3CPresentation } from "./types"
import type { DidUri } from "@agentcommercekit/did"

export type CreatePresentationParams = {
  credentials: Verifiable<W3CCredential>[]
  holder: DidUri
  id?: string
  type?: string | string[]
  issuanceDate?: Date
  expirationDate?: Date
}

export function createPresentation({
  credentials,
  holder,
  id,
  type,
  issuanceDate,
  expirationDate
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
    expirationDate: expirationDate?.toISOString()
  }
}
