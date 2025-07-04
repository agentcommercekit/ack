import type {
  JSONRPCErrorResponse,
  SendMessageResponse,
  SendMessageSuccessResponse
} from "@a2a-js/sdk"

export function isRpcSuccessResponse(
  resp: SendMessageResponse
): resp is SendMessageSuccessResponse {
  return "result" in resp
}

export function isRpcErrorResponse(
  resp: SendMessageResponse
): resp is JSONRPCErrorResponse {
  return "error" in resp
}

export function isMessageResponse(
  resp: SendMessageResponse
): resp is SendMessageSuccessResponse {
  if (isRpcErrorResponse(resp)) {
    return false
  }

  return resp.result.kind === "message"
}

export function isFailedTaskResponse(resp: SendMessageSuccessResponse) {
  if (isRpcErrorResponse(resp)) {
    return true
  }

  if (resp.result.kind === "task") {
    return resp.result.status.state == "failed"
  }

  return true
}
