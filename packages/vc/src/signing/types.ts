import type { JwtAlgorithm, JwtSigner } from "@agentcommercekit/jwt"

export interface Signer {
  /**
   * The algorithm to use for the JWT
   */
  alg?: JwtAlgorithm
  /**
   * The DID of the credential issuer
   */
  did: string
  /**
   * The signer to use for the JWT
   */
  signer: JwtSigner
}
