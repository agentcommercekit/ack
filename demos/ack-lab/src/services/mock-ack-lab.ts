import { Hono } from "hono"
import { cors } from "hono/cors"
import {
  createJwt,
  createJwtSigner,
  generateKeypair,
  parseJwtCredential,
  verifyJwt,
  type DidUri,
  type JwtString,
  type Keypair
} from "agentcommercekit"
import { colors, log } from "@repo/cli-tools"
import type { AgentData, AgentMetadata, TokenBalances } from "../types"

/**
 * Mock ACK-Lab Service
 *
 * Simulates the ACK-Lab platform that manages:
 * - Agent metadata and policies
 * - Token balances
 * - Payment requests and receipts
 * - Policy management and enforcement
 */
export class MockAckLabService {
  private agents: Map<DidUri, AgentData> = new Map()
  private balances: Map<DidUri, TokenBalances> = new Map()
  private keypairs: Map<DidUri, Keypair> = new Map()
  private paymentRequests: Map<string, any> = new Map()

  constructor(
    requestorData: AgentData,
    executorData: AgentData,
    requestorKeypair: Keypair,
    executorKeypair: Keypair
  ) {
    // Initialize agents
    this.agents.set(requestorData.did, requestorData)
    this.agents.set(executorData.did, executorData)

    // Store keypairs for JWT signing
    this.keypairs.set(requestorData.did, requestorKeypair)
    this.keypairs.set(executorData.did, executorKeypair)

    // Initialize balances - USDC uses 6 decimals, ETH uses 18
    this.balances.set(requestorData.did, {
      "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
        "1000000000", // 1000 USDC
      "caip19:eip155:1/slip44:60": "0" // 0 ETH
    })

    this.balances.set(executorData.did, {
      "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "0", // 0 USDC
      "caip19:eip155:1/slip44:60": "500000000000000000" // 0.5 ETH
    })
  }

  /**
   * Register additional agents (for multi-demo support)
   */
  registerAgent(
    agentData: AgentData,
    keypair: Keypair,
    initialBalance?: TokenBalances
  ) {
    // Add agent
    this.agents.set(agentData.did, agentData)

    // Store keypair
    this.keypairs.set(agentData.did, keypair)

    // Set initial balance if provided, otherwise default
    if (initialBalance) {
      this.balances.set(agentData.did, initialBalance)
    } else {
      // Default balance for data demo agents
      this.balances.set(agentData.did, {
        "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
          "1000000000", // 1000 USDC
        "caip19:eip155:1/slip44:60": "0" // 0 ETH
      })
    }

    log(colors.green(`[ACK-Lab] Registered agent: ${agentData.did}`))
  }

  /**
   * Helper function to find an agent with different colon encodings
   */
  private findAgentWithNormalizedDid(agentDid: DidUri): AgentData | undefined {
    // Try direct lookup first
    let agent = this.agents.get(agentDid)

    // If not found, try with URL-encoded port format
    // This handles both localhost and Replit domains
    if (!agent && agentDid.includes(":") && !agentDid.includes("%3A")) {
      // Has unencoded colon - try encoding it
      const encodedDid = agentDid.replace(/:(\d+)$/, "%3A$1") as DidUri
      agent = this.agents.get(encodedDid)
    }

    // If still not found, try with decoded port format
    if (!agent && agentDid.includes("%3A")) {
      // Has encoded colon - try decoding it
      const decodedDid = agentDid.replace(/%3A(\d+)$/, ":$1") as DidUri
      agent = this.agents.get(decodedDid)
    }

    return agent
  }

  /**
   * Helper function to check if an agent exists with different colon encodings
   */
  private hasAgentWithNormalizedDid(agentDid: DidUri): boolean {
    return this.findAgentWithNormalizedDid(agentDid) !== undefined
  }

  /**
   * Get agent metadata including DID and ownership VC
   */
  async getMetadata(agentDid: DidUri): Promise<AgentMetadata | null> {
    log(colors.dim(`[ACK-Lab] Metadata request for: ${agentDid}`))
    const agent = this.findAgentWithNormalizedDid(agentDid)

    if (!agent) {
      log(colors.red(`[ACK-Lab] Agent not found: ${agentDid}`))
      log(
        colors.dim(
          `[ACK-Lab] Known agents: ${Array.from(this.agents.keys()).join(", ")}`
        )
      )
      return null
    }

    log(colors.green(`[ACK-Lab] Found agent: ${agent.did}`))

    return {
      did: agent.did,
      vc: agent.vc,
      policies: agent.policies
    }
  }

  /**
   * Get all agents for policy management
   */
  async getAllAgents(): Promise<AgentData[]> {
    return Array.from(this.agents.values())
  }

  /**
   * Update agent policies
   */
  async updateAgentPolicies(agentDid: DidUri, policies: any): Promise<boolean> {
    log(colors.dim(`[ACK-Lab] Looking for agent: ${agentDid}`))
    log(
      colors.dim(
        `[ACK-Lab] Available agents: ${Array.from(this.agents.keys()).join(", ")}`
      )
    )

    const agent = this.findAgentWithNormalizedDid(agentDid)

    if (!agent) {
      log(
        colors.red(`[ACK-Lab] Agent not found for policy update: ${agentDid}`)
      )
      return false
    }

    agent.policies = policies

    // Find the correct key format that exists in the map
    let correctKey = agentDid
    if (!this.agents.has(agentDid)) {
      // Try to find the key that actually exists in the map
      for (const key of this.agents.keys()) {
        // Check if this is the same DID with different colon encoding
        const keyNormalized = key.replace(/%3A(\d+)$/, ":$1")
        const didNormalized = agentDid.replace(/%3A(\d+)$/, ":$1")
        if (keyNormalized === didNormalized) {
          correctKey = key
          break
        }
      }
    }

    this.agents.set(correctKey, agent)
    log(colors.green(`[ACK-Lab] Updated policies for agent: ${correctKey}`))
    return true
  }

  /**
   * Get agent's token balances
   */
  async getBalance(agentJwt: JwtString): Promise<TokenBalances | null> {
    // Verify JWT and extract agent DID
    const agentDid = await this.verifyAgentJwt(agentJwt)
    if (!agentDid) return null

    return this.balances.get(agentDid) || {}
  }

  /**
   * Create a payment request
   */
  async createPaymentRequest(
    agentJwt: JwtString,
    amount: number
  ): Promise<{ paymentToken: JwtString } | null> {
    const recipientDid = await this.verifyAgentJwt(agentJwt)
    if (!recipientDid) return null

    const paymentId = crypto.randomUUID()
    const keypair = this.keypairs.get(recipientDid)
    if (!keypair) return null

    const paymentData = {
      id: paymentId,
      recipient: recipientDid,
      amount,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }

    this.paymentRequests.set(paymentId, paymentData)

    // Create JWT payment token
    const paymentToken = await createJwt(paymentData, {
      issuer: recipientDid,
      signer: createJwtSigner(keypair),
      expiresIn: 300 // 5 minutes
    })

    return { paymentToken }
  }

  /**
   * Execute a payment
   */
  async executePayment(
    payerJwt: JwtString,
    paymentToken: JwtString
  ): Promise<{ receipt: JwtString } | null> {
    const payerDid = await this.verifyAgentJwt(payerJwt)
    if (!payerDid) return null

    // Parse payment token - decode JWT without full VC parsing
    const parts = paymentToken.split(".")
    if (parts.length !== 3) {
      log(colors.red("Invalid payment token format"))
      return null
    }
    const paymentData = JSON.parse(Buffer.from(parts[1]!, "base64").toString())

    // Verify payment request exists
    const storedPayment = this.paymentRequests.get(paymentData.id)
    if (!storedPayment) {
      log(colors.red("Payment request not found"))
      return null
    }

    // Check expiry
    if (new Date() > new Date(paymentData.expiresAt)) {
      log(colors.red("Payment request expired"))
      return null
    }

    // Get balances
    const payerBalances = this.balances.get(payerDid)
    const recipientBalances = this.balances.get(paymentData.recipient)

    if (!payerBalances || !recipientBalances) {
      log(colors.red("Balances not found"))
      return null
    }

    // USDC token identifier
    const usdcToken =
      "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

    // Check payer has sufficient balance
    const payerBalance = BigInt(payerBalances[usdcToken] || "0")
    const paymentAmount = BigInt(paymentData.amount)

    if (payerBalance < paymentAmount) {
      log(colors.red("Insufficient balance"))
      return null
    }

    // Execute transfer
    payerBalances[usdcToken] = (payerBalance - paymentAmount).toString()
    recipientBalances[usdcToken] = (
      BigInt(recipientBalances[usdcToken] || "0") + paymentAmount
    ).toString()

    // Update balances
    this.balances.set(payerDid, payerBalances)
    this.balances.set(paymentData.recipient, recipientBalances)

    // Create receipt
    const payerKeypair = this.keypairs.get(payerDid)
    if (!payerKeypair) return null

    const receipt = await createJwt(
      {
        type: "PaymentReceipt",
        paymentId: paymentData.id,
        payer: payerDid,
        recipient: paymentData.recipient,
        amount: paymentData.amount,
        timestamp: new Date().toISOString()
      },
      {
        issuer: payerDid,
        signer: createJwtSigner(payerKeypair),
        expiresIn: 3600 // 1 hour
      }
    )

    log(
      colors.green(
        `✅ Payment executed: ${paymentData.amount / 1000000} USDC from ${payerDid.slice(-8)} to ${paymentData.recipient.slice(-8)}`
      )
    )

    return { receipt }
  }

  /**
   * Mock swap execution - transfers ETH to requestor
   */
  async executeSwap(
    executorDid: DidUri,
    requestorDid: DidUri,
    ethAmount: string
  ): Promise<boolean> {
    const executorBalances = this.balances.get(executorDid)
    const requestorBalances = this.balances.get(requestorDid)

    if (!executorBalances || !requestorBalances) return false

    const ethToken = "caip19:eip155:1/slip44:60"
    const executorEth = BigInt(executorBalances[ethToken] || "0")
    const transferAmount = BigInt(ethAmount)

    if (executorEth < transferAmount) {
      log(colors.red("Executor has insufficient ETH"))
      return false
    }

    // Transfer ETH
    executorBalances[ethToken] = (executorEth - transferAmount).toString()
    requestorBalances[ethToken] = (
      BigInt(requestorBalances[ethToken] || "0") + transferAmount
    ).toString()

    this.balances.set(executorDid, executorBalances)
    this.balances.set(requestorDid, requestorBalances)

    return true
  }

  /**
   * Reset all agent balances to initial values
   */
  async resetBalances(): Promise<boolean> {
    try {
      log(
        colors.cyan(
          "[ACK-Lab] Resetting all agent balances to initial values..."
        )
      )

      for (const [did, _] of this.balances) {
        if (did.includes("5678")) {
          // Requestor agent - reset to 100 USDC, 0 ETH
          this.balances.set(did, {
            "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
              "100000000", // 100 USDC
            "caip19:eip155:1/slip44:60": "0" // 0 ETH
          })
          log(colors.green(`[ACK-Lab] Reset ${did} to 100 USDC, 0 ETH`))
        } else if (did.includes("5679")) {
          // Executor agent - reset to 0 USDC, 0.5 ETH
          this.balances.set(did, {
            "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
              "0", // 0 USDC
            "caip19:eip155:1/slip44:60": "500000000000000000" // 0.5 ETH
          })
          log(colors.green(`[ACK-Lab] Reset ${did} to 0 USDC, 0.5 ETH`))
        }
      }

      log(colors.green("[ACK-Lab] ✅ All balances reset successfully"))
      return true
    } catch (error) {
      log(colors.red(`[ACK-Lab] Failed to reset balances: ${error}`))
      return false
    }
  }

  /**
   * Add USDC to requestor agent (topup)
   */
  async topupRequestor(amount: number = 100): Promise<boolean> {
    try {
      log(colors.cyan(`[ACK-Lab] Adding ${amount} USDC to requestor agent...`))

      const requestorDid = Array.from(this.balances.keys()).find((did) =>
        did.includes("5678")
      )
      if (!requestorDid) {
        log(colors.red("[ACK-Lab] Requestor agent not found"))
        return false
      }

      const balances = this.balances.get(requestorDid)
      if (!balances) {
        log(colors.red("[ACK-Lab] Requestor balances not found"))
        return false
      }

      const usdcToken =
        "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
      const currentUsdc = BigInt(balances[usdcToken] || "0")
      const topupAmount = BigInt(amount * 1000000) // Convert to subunits
      const newUsdc = currentUsdc + topupAmount

      balances[usdcToken] = newUsdc.toString()
      this.balances.set(requestorDid, balances)

      const newUsdcDisplay = Number(newUsdc) / 1000000
      log(
        colors.green(
          `[ACK-Lab] ✅ Added ${amount} USDC to requestor. New balance: ${newUsdcDisplay} USDC`
        )
      )
      return true
    } catch (error) {
      log(colors.red(`[ACK-Lab] Failed to topup requestor: ${error}`))
      return false
    }
  }

  /**
   * Verify agent JWT and extract DID
   */
  private async verifyAgentJwt(jwt: JwtString): Promise<DidUri | null> {
    try {
      // Decode JWT to get issuer
      const parts = jwt.split(".")
      if (parts.length !== 3) {
        return null
      }
      const payload = JSON.parse(Buffer.from(parts[1]!, "base64").toString())
      const issuer = payload.iss as DidUri

      // Check if agent exists, handling colon encoding
      if (!this.hasAgentWithNormalizedDid(issuer)) {
        return null
      }

      return issuer
    } catch (error) {
      log(colors.red("Failed to verify agent JWT"))
      return null
    }
  }

  /**
   * Create HTTP server
   */
  createServer() {
    const app = new Hono()

    app.use("*", cors())

    // GET /metadata - Public endpoint
    app.get("/metadata", async (c) => {
      let did = c.req.query("did") as DidUri
      if (!did) {
        return c.json({ error: "Missing did parameter" }, 400)
      }

      log(colors.dim(`[ACK-Lab Server] Raw query DID: ${did}`))

      // The storage format uses did:web:localhost%3A5679 (port colon encoded)
      // The query might come in various formats, normalize it

      // If it's URL-encoded (did%3Aweb%3A...), decode it first
      let normalizedDid = did
      while (normalizedDid.includes("%3A") || normalizedDid.includes("%2523")) {
        const before = normalizedDid
        normalizedDid = decodeURIComponent(normalizedDid) as DidUri
        if (before === normalizedDid) break // Prevent infinite loop
      }

      log(colors.dim(`[ACK-Lab Server] After decode: ${normalizedDid}`))

      // Now we should have something like did:web:domain:5679 or did:web:domain%3A5679
      // Normalize to match storage format (did:web:domain%3A5679)
      // Check if it has an unencoded port colon at the end
      if (normalizedDid.match(/:(\d+)$/) && !normalizedDid.includes("%3A")) {
        // Replace the port colon with %3A
        normalizedDid = normalizedDid.replace(/:(\d+)$/, "%3A$1") as DidUri
      }

      log(colors.dim(`[ACK-Lab Server] Final normalized: ${normalizedDid}`))

      const metadata = await this.getMetadata(normalizedDid)
      if (!metadata) {
        return c.json({ error: "Agent not found" }, 404)
      }

      return c.json(metadata)
    })

    // GET /balance - Requires auth
    app.get("/balance", async (c) => {
      const auth = c.req.header("Authorization")
      if (!auth?.startsWith("Bearer ")) {
        return c.json({ error: "Missing authorization" }, 401)
      }

      const jwt = auth.slice(7) as JwtString
      const balance = await this.getBalance(jwt)

      if (!balance) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      return c.json(balance)
    })

    // GET /agents - Get all agents for policy management
    app.get("/agents", async (c) => {
      const agents = await this.getAllAgents()
      return c.json(agents)
    })

    // PUT /agents/:did/policies - Update agent policies
    app.put("/agents/:did/policies", async (c) => {
      const did = decodeURIComponent(c.req.param("did")) as DidUri
      const policies = await c.req.json()

      const success = await this.updateAgentPolicies(did, policies)
      if (!success) {
        return c.json({ error: "Failed to update policies" }, 400)
      }

      return c.json({ success: true })
    })

    // POST /payment-request - Requires auth
    app.post("/payment-request", async (c) => {
      const auth = c.req.header("Authorization")
      if (!auth?.startsWith("Bearer ")) {
        return c.json({ error: "Missing authorization" }, 401)
      }

      const jwt = auth.slice(7) as JwtString
      const { amount } = await c.req.json()

      const result = await this.createPaymentRequest(jwt, amount)
      if (!result) {
        return c.json({ error: "Failed to create payment request" }, 400)
      }

      return c.json(result)
    })

    // POST /payment - Requires auth
    app.post("/payment", async (c) => {
      const auth = c.req.header("Authorization")
      if (!auth?.startsWith("Bearer ")) {
        return c.json({ error: "Missing authorization" }, 401)
      }

      const jwt = auth.slice(7) as JwtString
      const { paymentToken } = await c.req.json()

      const result = await this.executePayment(jwt, paymentToken)
      if (!result) {
        return c.json({ error: "Payment failed" }, 400)
      }

      return c.json(result)
    })

    // POST /swap-transfer - Mock swap execution (transfer ETH to requestor)
    app.post("/swap-transfer", async (c) => {
      const body = await c.req.json()
      const { executorDid, requestorDid, ethAmount } = body

      const success = await this.executeSwap(
        executorDid,
        requestorDid,
        ethAmount
      )

      if (!success) {
        return c.json({ error: "Swap transfer failed" }, 500)
      }

      return c.json({ success: true })
    })

    // POST /reset-balances - Reset all agent balances to initial values
    app.post("/reset-balances", async (c) => {
      const success = await this.resetBalances()
      if (!success) {
        return c.json({ error: "Failed to reset balances" }, 500)
      }
      return c.json({
        success: true,
        message: "All balances reset to initial values"
      })
    })

    // POST /topup-requestor - Add USDC to requestor agent
    app.post("/topup-requestor", async (c) => {
      const body = await c.req.json().catch(() => ({}))
      const amount = body.amount || 100

      if (typeof amount !== "number" || amount <= 0 || amount > 10000) {
        return c.json(
          { error: "Invalid amount. Must be between 1 and 10000 USDC" },
          400
        )
      }

      const success = await this.topupRequestor(amount)
      if (!success) {
        return c.json({ error: "Failed to topup requestor" }, 500)
      }
      return c.json({
        success: true,
        message: `Added ${amount} USDC to requestor`
      })
    })

    // Serve static files for policy management UI
    app.get("/admin", (c) => {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ACK-Lab Policy Manager</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div style="padding: 2rem; font-family: system-ui, -apple-system, sans-serif;">
            <h1>🛡️ ACK-Lab Policy Manager</h1>
            <p>The policy management interface is available at:</p>
            <p><strong>http://localhost:3001</strong></p>
            <p>Start the policy UI with: <code>cd ack-lab-ui && npm run dev -- -p 3001</code></p>
          </div>
        </body>
        </html>
      `)
    })

    return app
  }
}
