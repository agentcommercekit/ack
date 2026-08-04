export class CredentialVerificationError extends Error {}

export class InvalidCredentialError extends CredentialVerificationError {
  constructor(message = "Invalid credential") {
    super(message)
    this.name = "InvalidCredentialError"
  }
}

export class InvalidControllerClaimError extends CredentialVerificationError {
  constructor(message = "Invalid controller claim") {
    super(message)
    this.name = "InvalidControllerClaimError"
  }
}

export class InvalidCredentialSubjectError extends CredentialVerificationError {
  constructor(message = "Invalid credential subject") {
    super(message)
    this.name = "InvalidCredentialSubjectError"
  }
}

export class UnsupportedProofTypeError extends CredentialVerificationError {
  constructor(message = "Unsupported proof type") {
    super(message)
  }
}

export class InvalidProofError extends CredentialVerificationError {
  constructor(message = "Invalid proof") {
    super(message)
  }
}

export class CredentialExpiredError extends CredentialVerificationError {
  constructor(message = "Credential is expired") {
    super(message)
  }
}

export class CredentialRevokedError extends CredentialVerificationError {
  constructor(message = "Credential is revoked") {
    super(message)
  }
}

/**
 * Thrown when a credential's revocation status cannot be established — the
 * status list is unreachable, malformed, unsigned, signed by the wrong issuer,
 * or does not cover the credential's index.
 *
 * An undeterminable status is NOT the same as "not revoked": treating it as
 * such lets anyone who can disrupt the status list endpoint resurrect a revoked
 * credential (CWE-299).
 */
export class RevocationCheckError extends CredentialVerificationError {
  /**
   * What actually went wrong, for logs. Kept out of `message` on purpose: API
   * error handlers return the message of a {@link CredentialVerificationError}
   * to the caller, and the detail names the URL that was dereferenced and the
   * response it produced.
   */
  readonly detail?: string

  constructor(
    message = "Unable to determine credential revocation status",
    options: { cause?: unknown; detail?: string } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = "RevocationCheckError"
    this.detail = options.detail
  }
}

/**
 * Thrown when a credential carries a `credentialStatus` this library cannot
 * evaluate. The credential may well be revoked, so it is rejected rather than
 * accepted on the strength of a status we never read.
 */
export class UnsupportedCredentialStatusError extends CredentialVerificationError {
  /**
   * Which status could not be evaluated, for logs. Kept out of `message` for
   * the same reason as {@link RevocationCheckError.detail}: the value comes
   * from the credential, and API error handlers return the message to the
   * caller.
   */
  readonly detail?: string

  constructor(
    message = "Unsupported credential status",
    options: { detail?: string } = {},
  ) {
    super(message)
    this.name = "UnsupportedCredentialStatusError"
    this.detail = options.detail
  }
}

export class UntrustedIssuerError extends CredentialVerificationError {
  constructor(message = "Issuer is not a known trusted issuer") {
    super(message)
  }
}

export class UnsupportedCredentialTypeError extends CredentialVerificationError {
  constructor(message = "Unsupported credential type") {
    super(message)
  }
}
