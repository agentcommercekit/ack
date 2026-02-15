import type { Env, MiddlewareHandler } from "hono"

import { getDb, type DatabaseClient } from "@/db/get-db"

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
