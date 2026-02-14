import { join } from "node:path"
import { getDb } from "@/db/get-db"
import app from "@/index"
import { serve } from "@hono/node-server"
import { migrate } from "drizzle-orm/libsql/migrator"

async function startServer() {
  const db = getDb()

  await migrate(db, {
    migrationsFolder: join(
      import.meta.dirname,
      "..",
      "src",
      "db",
      "migrations",
    ),
  })

  serve(
    {
      fetch: app.fetch,
      port: 3456,
    },
    ({ port }) => {
      console.log(`> issuer running at http://localhost:${port}`)
    },
  )
}

void startServer()
