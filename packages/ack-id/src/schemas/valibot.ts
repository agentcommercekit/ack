import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
import * as v from "valibot"

export const controllerClaimSchema = v.object({
  id: didUriSchema,
  controller: didUriSchema,
})
