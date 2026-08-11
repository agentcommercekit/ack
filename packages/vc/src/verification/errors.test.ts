import { describe, expect, it } from "vitest"

import {
  CredentialExpiredError,
  CredentialRevokedError,
  CredentialVerificationError,
  InvalidControllerClaimError,
  InvalidCredentialError,
  InvalidCredentialSubjectError,
  InvalidProofError,
  RevocationCheckError,
  UnsupportedCredentialStatusError,
  UnsupportedCredentialTypeError,
  UnsupportedProofTypeError,
  UntrustedIssuerError,
} from "./errors"

interface ErrorCase {
  name: string
  create: (message?: string) => CredentialVerificationError
  defaultMessage: string
  expectedName?: string
}

const cases: ErrorCase[] = [
  {
    name: "InvalidCredentialError",
    create: (message) => new InvalidCredentialError(message),
    defaultMessage: "Invalid credential",
    expectedName: "InvalidCredentialError",
  },
  {
    name: "InvalidControllerClaimError",
    create: (message) => new InvalidControllerClaimError(message),
    defaultMessage: "Invalid controller claim",
    expectedName: "InvalidControllerClaimError",
  },
  {
    name: "InvalidCredentialSubjectError",
    create: (message) => new InvalidCredentialSubjectError(message),
    defaultMessage: "Invalid credential subject",
    expectedName: "InvalidCredentialSubjectError",
  },
  {
    name: "UnsupportedProofTypeError",
    create: (message) => new UnsupportedProofTypeError(message),
    defaultMessage: "Unsupported proof type",
  },
  {
    name: "InvalidProofError",
    create: (message) => new InvalidProofError(message),
    defaultMessage: "Invalid proof",
  },
  {
    name: "CredentialExpiredError",
    create: (message) => new CredentialExpiredError(message),
    defaultMessage: "Credential is expired",
  },
  {
    name: "CredentialRevokedError",
    create: (message) => new CredentialRevokedError(message),
    defaultMessage: "Credential is revoked",
  },
  {
    name: "RevocationCheckError",
    create: (message) => new RevocationCheckError(message),
    defaultMessage: "Unable to determine credential revocation status",
    expectedName: "RevocationCheckError",
  },
  {
    name: "UnsupportedCredentialStatusError",
    create: (message) => new UnsupportedCredentialStatusError(message),
    defaultMessage: "Unsupported credential status",
    expectedName: "UnsupportedCredentialStatusError",
  },
  {
    name: "UntrustedIssuerError",
    create: (message) => new UntrustedIssuerError(message),
    defaultMessage: "Issuer is not a known trusted issuer",
  },
  {
    name: "UnsupportedCredentialTypeError",
    create: (message) => new UnsupportedCredentialTypeError(message),
    defaultMessage: "Unsupported credential type",
  },
]

const namedCases = cases.filter(
  (errorCase): errorCase is ErrorCase & { expectedName: string } =>
    errorCase.expectedName !== undefined,
)

describe("credential verification errors", () => {
  describe.each(cases)("$name", ({ create, defaultMessage }) => {
    it("extends CredentialVerificationError and Error", () => {
      const error = create()
      expect(error).toBeInstanceOf(CredentialVerificationError)
      expect(error).toBeInstanceOf(Error)
    })

    it("uses its default message", () => {
      expect(create().message).toBe(defaultMessage)
    })

    it("accepts a custom message", () => {
      expect(create("Something went wrong").message).toBe(
        "Something went wrong",
      )
    })
  })

  it.each(namedCases)("$name sets its name", ({ create, expectedName }) => {
    expect(create().name).toBe(expectedName)
  })

  it("CredentialVerificationError is a plain Error subclass", () => {
    const error = new CredentialVerificationError("boom")
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("boom")
  })

  describe("RevocationCheckError", () => {
    it("has no detail by default", () => {
      expect(new RevocationCheckError().detail).toBeUndefined()
    })

    it("stores the provided detail", () => {
      const detail = "GET https://issuer.example.com/status/1 returned 500"
      expect(new RevocationCheckError(undefined, { detail }).detail).toBe(
        detail,
      )
    })

    it("keeps detail out of the message", () => {
      const detail = "GET https://issuer.example.com/status/1 returned 500"
      const error = new RevocationCheckError(undefined, { detail })
      expect(error.message).toBe(
        "Unable to determine credential revocation status",
      )
      expect(error.message).not.toContain(detail)
    })

    it("propagates the cause", () => {
      const cause = new Error("network down")
      const error = new RevocationCheckError(undefined, { cause })
      expect(error.cause).toBe(cause)
    })
  })

  describe("UnsupportedCredentialStatusError", () => {
    it("has no detail by default", () => {
      expect(new UnsupportedCredentialStatusError().detail).toBeUndefined()
    })

    it("stores the provided detail", () => {
      const detail = "UnknownStatusList2099"
      expect(
        new UnsupportedCredentialStatusError(undefined, { detail }).detail,
      ).toBe(detail)
    })

    it("keeps detail out of the message", () => {
      const detail = "UnknownStatusList2099"
      const error = new UnsupportedCredentialStatusError(undefined, { detail })
      expect(error.message).toBe("Unsupported credential status")
      expect(error.message).not.toContain(detail)
    })
  })
})
