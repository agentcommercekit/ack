/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JwtCredentialPayload, Verifiable } from "did-jwt-vc"

type Extensible<T> = T & Record<string, any>

export interface CredentialStatus {
  id: string
  type: string
}

type W3CCredential = {
  "@context": string[]
  id?: string
  type: string[]
  issuer: Extensible<{ id: string }>
  issuanceDate: string
  expirationDate?: string
  credentialSubject: Extensible<{
    id?: string
  }>
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

export type CredentialSubject = W3CCredential["credentialSubject"]
export type { JwtCredentialPayload, Verifiable, W3CCredential, W3CPresentation }
