/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JwtCredentialPayload, Verifiable } from "did-jwt-vc"

type Extensible<T> = T & Record<string, any>

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

  evidence?: any
  termsOfUse?: any
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
