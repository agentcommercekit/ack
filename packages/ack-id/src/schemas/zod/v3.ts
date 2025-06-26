import { z } from "zod"

export const controllerClaimSchema = z.object({
  id: z.string(),
  controller: z.string()
})
