import { Hono } from "hono"
import { cors } from "hono/cors"
import { streamSSE } from "hono/streaming"

/**
 * Creates a router that proxies requests to the appropriate demo agent
 * based on the active demo context
 */
export class DemoRouter {
  private app: Hono
  private activeDemo: "swap" | "data" = "swap"
  private sseClients: Set<any> = new Set()

  constructor() {
    this.app = new Hono()
    this.setupRoutes()
  }

  private setupRoutes() {
    // Enable CORS
    this.app.use("*", cors())

    // Demo context switch endpoint
    this.app.post("/switch-demo", async (c) => {
      const { demo } = await c.req.json()
      if (demo === "swap" || demo === "data") {
        this.activeDemo = demo
        console.log(`✅ Demo context switched to: ${demo.toUpperCase()}`)
        return c.json({ success: true, activeDemo: this.activeDemo })
      }
      return c.json({ error: "Invalid demo type" }, 400)
    })

    // Get current demo context
    this.app.get("/active-demo", (c) => {
      return c.json({ activeDemo: this.activeDemo })
    })

    // Main chat endpoint - routes to appropriate agent
    this.app.post("/chat", async (c) => {
      const body = await c.req.json()

      // Determine target port based on active demo
      const targetPort = this.activeDemo === "swap" ? 5678 : 5682

      try {
        // Forward request to appropriate agent
        const response = await fetch(`http://localhost:${targetPort}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const error = await response.text()
          return c.json({ error }, response.status)
        }

        const result = await response.json()
        return c.json(result)
      } catch (error) {
        console.error(`Failed to proxy to port ${targetPort}:`, error)
        return c.json({ error: "Failed to communicate with agent" }, 500 as any)
      }
    })

    // SSE endpoint for real-time updates
    this.app.get("/events", (c) => {
      return streamSSE(c, async (stream) => {
        // Determine target port based on active demo
        const targetPort = this.activeDemo === "swap" ? 5678 : 5682

        // Log only in development/debug mode
        if (process.env.DEBUG) {
          console.log(
            `📡 Proxying SSE from port ${targetPort} for ${this.activeDemo} demo`
          )
        }

        try {
          // Connect to the appropriate agent's SSE endpoint
          const response = await fetch(
            `http://localhost:${targetPort}/events`,
            {
              headers: {
                Accept: "text/event-stream"
              },
              // @ts-ignore - signal is not in the type definition but it works
              signal: stream.signal
            }
          )

          if (!response.ok) {
            console.error(`Failed to connect to agent SSE: ${response.status}`)
            stream.writeSSE({
              data: JSON.stringify({ error: "Failed to connect to agent" }),
              event: "error"
            })
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            console.error("No reader available from response")
            return
          }

          const decoder = new TextDecoder()
          let buffer = ""

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })

              // Process complete SSE messages
              const lines = buffer.split("\n")
              buffer = lines.pop() || "" // Keep the incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6)
                  stream.writeSSE({
                    data: data,
                    event: "message"
                  })
                } else if (line.startsWith("event: ")) {
                  // Handle custom events if needed
                  console.log("Custom SSE event:", line)
                } else if (line === "") {
                  // Empty line signals end of message
                  continue
                }
              }
            }
          } catch (error) {
            console.error("Error reading SSE stream:", error)
          } finally {
            reader.releaseLock()
          }
        } catch (error) {
          console.error("Failed to establish SSE connection:", error)
          stream.writeSSE({
            data: JSON.stringify({ error: "Connection failed" }),
            event: "error"
          })
        }
      })
    })

    // Health check
    this.app.get("/health", (c) => {
      return c.json({
        status: "ok",
        activeDemo: this.activeDemo,
        timestamp: new Date().toISOString()
      })
    })
  }

  public getApp() {
    return this.app
  }
}
