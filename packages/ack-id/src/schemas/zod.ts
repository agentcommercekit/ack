import { didUriSchema } from "@agentcommercekit/did/schemas/zod"
import * as z from "zod"

export const controllerClaimSchema = z.object({
  id: didUriSchema,
  controller: didUriSchema,
})
