import * as z from "zod/v4"

export const controllerClaimSchema = z.object({
  id: z.string(),
  controller: z.string()
})
