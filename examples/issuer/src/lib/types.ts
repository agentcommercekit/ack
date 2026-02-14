import type {
  DidDocument,
  DidUri,
  JwtAlgorithm,
  JwtSigner,
  JwtString,
  Verifiable,
  W3CCredential,
} from "agentcommercekit"

export type Issuer = {
  /**
   * The Did of the issuer
   */
  did: DidUri
  /**
   * The Did document of the issuer
   */
  didDocument: DidDocument
  /**
   * The signer for this issuer
   */
  signer: JwtSigner
  /**
   * The algorithm used by the signer
   * @example "ES256K"
   */
  alg: JwtAlgorithm
}

export type CredentialResponse = {
  credential: Verifiable<W3CCredential>
  jwt: JwtString
}
