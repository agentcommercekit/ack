import { getDb, type DatabaseClient } from "@/db/get-db"
import type { Env, MiddlewareHandler } from "hono"

declare module "hono" {
  interface ContextVariableMap {
    db: DatabaseClient
  }
}

export function database(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const db = getDb()
    c.set("db", db)
    await next()
  }
}
