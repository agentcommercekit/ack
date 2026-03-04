import { DidResolutionError } from "@agentcommercekit/did"
import { CredentialVerificationError } from "@agentcommercekit/vc"
import type { TypedResponse } from "hono"
import * as v from "valibot"

export type ApiResponse<T> = TypedResponse<ApiSuccessResponse<T>>

export type ApiSuccessResponse<T> = {
  ok: true
  data: T
}

/**
 * Generates a successful API response object
 */
export function apiSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    ok: true,
    data,
  }
}

export type ApiErrorResponse = {
  ok: false
  error: string
  issues?: v.BaseIssue<unknown>[]
}

export function formatErrorResponse(
  error: Error,
  message?: string,
): ApiErrorResponse {
  if (error instanceof DidResolutionError) {
    return {
      ok: false,
      error: message ?? error.message,
    }
  }

  if (error instanceof CredentialVerificationError) {
    return {
      ok: false,
      error: message ?? error.message,
    }
  }

  if (v.isValiError(error)) {
    return {
      ok: false,
      error: message ?? "Invalid request",
      issues: error.issues,
    }
  }

  return {
    ok: false,
    error: message ?? error.message,
  }
}
