import type { JwtCredentialPayload, Verifiable } from "did-jwt-vc"

type Extensible<T> = T & Record<string, unknown>

export interface CredentialStatus {
  id: string
  type: string
}

type W3CCredential<T = unknown> = {
  "@context": string[]
  id?: string
  type: string[]
  issuer: Extensible<{ id: string }>
  issuanceDate: string
  expirationDate?: string
  credentialSubject: Extensible<{ id?: string } & T>
  credentialStatus?: CredentialStatus

  evidence?: unknown
  termsOfUse?: unknown
}

type W3CPresentation = {
  "@context": string[]
  type: string[]
  id?: string
  verifiableCredential?: Verifiable<W3CCredential>[]
  holder: string
  issuanceDate?: string
  expirationDate?: string
}

export type CredentialSubject<T = unknown> =
  W3CCredential<T>["credentialSubject"]
export type { JwtCredentialPayload, Verifiable, W3CCredential, W3CPresentation }
