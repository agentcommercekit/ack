import { z } from "zod/v3"

export const controllerClaimSchema = z.object({
  id: z.string(),
  controller: z.string()
})
