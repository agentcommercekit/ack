import * as v from "valibot"

export const controllerClaimSchema = v.object({
  id: v.string(),
  controller: v.string(),
})
