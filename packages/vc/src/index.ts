import { verifyPresentation } from "did-jwt-vc"

export * from "./create-credential"
export * from "./create-presentation"
export * from "./is-credential"
export * from "./signing/sign-credential"
export * from "./signing/sign-presentation"
export * from "./types"
export * from "./revocation/make-revocable"
export * from "./revocation/status-list-credential"
export * from "./revocation/types"
export * from "./verification/errors"
export * from "./verification/is-expired"
export * from "./verification/is-revoked"
export * from "./verification/types"
export * from "./verification/parse-jwt-credential"
export * from "./verification/verify-parsed-credential"
export * from "./verification/verify-proof"

/**
 * Re-exported from did-jwt-vc unchanged.
 *
 * This does NOT bind the presentation to its signer the way
 * {@link parseJwtCredential} binds a credential. `normalizeJwtPresentationPayload`
 * takes `holder` from `iss` only when the payload carries no `holder`, so a
 * presentation can name a holder that did not sign it. It also does not verify
 * the proofs of the credentials it embeds.
 *
 * Check `holder` against the verified signer yourself, and pass each embedded
 * credential's `proof.jwt` through {@link parseJwtCredential}, before you trust
 * anything this returns.
 */
export { verifyPresentation }
