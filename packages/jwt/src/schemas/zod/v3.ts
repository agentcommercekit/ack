import { z } from "zod"
import { isJwtString } from "../../jwt-string"

export const jwtStringSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/)
  .refine((input) => isJwtString(input), {
    message: "Invalid JWT string"
  })
