import type { Resolvable } from "@agentcommercekit/did"
import type { JwtAlgorithm, JwtSigner } from "@agentcommercekit/jwt"

export interface SignOptions {
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
  /**
   * A resolver to use for parsing the signed credential
   */
  resolver: Resolvable
}
