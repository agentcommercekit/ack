import type { Resolvable } from "@agentcommercekit/did"
import type { CredentialSubject } from "../types"

export type ClaimVerifier = {
  accepts(type: string[]): boolean
  verify(
    credentialSubject: CredentialSubject,
    resolver: Resolvable
  ): Promise<void>
}
