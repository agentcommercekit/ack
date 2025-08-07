import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { generateText, tool, type CoreMessage } from "ai"
import { z } from "zod"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { colors, log } from "@repo/cli-tools"
import { parseJwtCredential, type JwtString } from "agentcommercekit"
import { BaseAgent } from "./base-agent"
import type { SwapRequest, SwapResult } from "../types"

/**
 * Swap Requestor Agent
 * Accepts natural language swap requests and initiates swaps with the executor
 */
export class SwapRequestorAgent extends BaseAgent {
  private swapComplete = false
  private messages: CoreMessage[] = []
  private balanceChecked = false
  private identityVerified = false
  private swapInitiated = false

  /**
   * Get system prompt for the agent
   */
  private getSystemPrompt(): string {
    return `You are a swap requestor agent that helps users swap between USDC and ETH.

CRITICAL INSTRUCTIONS FOR SEAMLESS SWAP EXECUTION:
1. When a user asks to swap tokens, ALWAYS execute these tools automatically in sequence:
   a. First call prepareSwap to check balance and verify the executor
   b. Immediately after prepareSwap succeeds, call initiateSwap
   c. If initiateSwap returns status: "PAYMENT_REQUIRED", IMMEDIATELY call sendPayment with the paymentToken
   d. NEVER ask the user to manually send payment - do it automatically in the same conversation

2. Extract the swap amount from the user's request. Common requests:
   - "Swap 60 USDC for ETH" → amountIn: 60
   - "Can you swap 60 usdc for eth?" → amountIn: 60
   - "Exchange 60 USDC to ETH" → amountIn: 60

3. Execute the full swap flow without stopping for user input. Only provide status updates.

4. IMPORTANT: If initiateSwap returns status: "PAYMENT_REQUIRED" with a paymentToken, AUTOMATICALLY call sendPayment immediately - do NOT wait for user confirmation.

Your DID is: ${this.did}
The executor is at: did:web:localhost:5679

Available tools (CHAIN AUTOMATICALLY):
- prepareSwap: Checks balance and verifies executor (use FIRST)
- initiateSwap: Sends the swap request (use AFTER prepareSwap succeeds)
- sendPayment: Handles payment automatically when required (use when initiateSwap returns paymentRequired)

Remember: Execute the COMPLETE swap flow automatically. Never stop mid-flow to ask for user confirmation.

TOOL EXECUTION RULES:
- If prepareSwap succeeds → IMMEDIATELY call initiateSwap
- If initiateSwap returns status: "PAYMENT_REQUIRED" → IMMEDIATELY call sendPayment with the paymentToken
- Continue until the swap is fully complete`
  }

  /**
   * Run the agent with user input
   */
  async run(userInput: string): Promise<void> {
    this.messages.push({
      role: "user",
      content: userInput
    })

    // Check for API keys
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      log(colors.red("\n❌ No API key found!"))
      log(colors.yellow("Please set one of the following in your .env file:"))
      log(colors.dim("  ANTHROPIC_API_KEY=your_key_here"))
      log(colors.dim("  or"))
      log(colors.dim("  OPENAI_API_KEY=your_key_here"))

      this.messages.push({
        role: "assistant",
        content:
          "I need an API key to process your request. Please add either ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env file."
      })
      return
    }

    const model = process.env.OPENAI_API_KEY
      ? openai("gpt-4o")
      : anthropic("claude-3-5-sonnet-20241022")

    log(
      colors.dim(
        `Using model: ${process.env.OPENAI_API_KEY ? "OpenAI GPT-4o" : "Anthropic Claude"}`
      )
    )

    const result = await generateText({
      model,
      system: this.getSystemPrompt(),
      messages: this.messages,
      maxSteps: 10,
      tools: {
        prepareSwap: tool({
          description:
            "Prepare for swap by checking balance and verifying executor identity",
          parameters: z.object({
            amountIn: z.number().describe("Amount of USDC to swap"),
            tokenOut: z.string().describe("Token to receive (ETH)")
          }),
          execute: async ({ amountIn, tokenOut }) => {
            // Step 1: Check balance
            log(colors.cyan("📊 Checking balance..."))
            const balance = await this.checkBalance()
            if (!balance) {
              const error = "Failed to check balance"
              log(colors.red(`   ❌ ${error}`))
              return { success: false, error }
            }

            const usdcBalance = BigInt(
              balance[
                "caip19:eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
              ] || "0"
            )
            const ethBalance = BigInt(
              balance["caip19:eip155:1/slip44:60"] || "0"
            )

            const usdcAmount = Number(usdcBalance) / 1000000
            const ethAmount = Number(ethBalance) / 10 ** 18

            log(
              colors.green(
                `   ✓ Balance: ${usdcAmount} USDC, ${ethAmount.toFixed(4)} ETH`
              )
            )

            if (usdcAmount < amountIn) {
              const error = `Insufficient USDC balance. You have ${usdcAmount} USDC but need ${amountIn} USDC`
              log(colors.red(`   ❌ ${error}`))
              return {
                success: false,
                error
              }
            }

            // Step 2: Verify executor identity
            log(colors.cyan("🔐 Verifying executor identity..."))
            const executorDid = "did:web:localhost%3A5679" // Use URL-encoded format
            log(colors.dim(`   Looking up ${executorDid} at ACK-Lab...`))

            const metadata = await this.fetchCounterpartyMetadata(
              executorDid as any
            )

            if (!metadata) {
              const error = "Could not fetch executor metadata from ACK-Lab"
              log(colors.red(`   ❌ ${error}`))
              log(
                colors.dim(
                  `   Tried: ${this.ackLabUrl}/metadata?did=${executorDid}`
                )
              )
              return {
                success: false,
                error
              }
            }

            log(colors.green(`   ✓ Found executor metadata`))

            try {
              const parsed = await parseJwtCredential(
                metadata.vc,
                this.resolver
              )
              await this.verifier.verifyCredential(parsed)
              log(colors.green("   ✓ Executor identity verified"))
            } catch (error) {
              log(colors.red(`   ❌ Invalid executor credentials: ${error}`))
              return { success: false, error: "Invalid executor credentials" }
            }

            // Step 3: Check policies
            log(colors.cyan("📋 Checking policy compliance..."))
            const policyResult = await this.checkPolicies(metadata, amountIn)
            if (!policyResult.allowed) {
              log(colors.red(`   ❌ Policy violation: ${policyResult.reason}`))
              return {
                success: false,
                error: `Policy violation: ${policyResult.reason}`
              }
            }
            log(colors.green("   ✓ Policy compliance verified"))

            this.balanceChecked = true
            this.identityVerified = true

            const result = {
              success: true,
              balance: { usdc: usdcAmount, eth: ethAmount },
              executorVerified: true,
              readyToSwap: true,
              message: `Ready to swap ${amountIn} USDC for ${tokenOut}. You have ${usdcAmount} USDC available.`
            }

            log(colors.green(`   ✓ prepareSwap complete: ${result.message}`))
            return result
          }
        }),

        initiateSwap: tool({
          description:
            "Initiate the swap with the executor after preparation. If the response has status: 'PAYMENT_REQUIRED', you MUST immediately call sendPayment with the paymentToken from the response.",
          parameters: z.object({
            amountIn: z.number().describe("Amount of USDC to swap"),
            tokenIn: z.string().default("USDC").describe("Input token"),
            tokenOut: z.string().default("ETH").describe("Output token")
          }),
          execute: async ({ amountIn, tokenIn = "USDC", tokenOut = "ETH" }) => {
            // Skip re-verification if already done
            if (!this.balanceChecked || !this.identityVerified) {
              log(colors.dim("   Doing quick verification..."))
              // Do quick verification
              const executorDid = "did:web:localhost%3A5679" // Use URL-encoded format
              const metadata = await this.fetchCounterpartyMetadata(
                executorDid as any
              )
              if (!metadata) {
                const error = "Could not reach executor"
                log(colors.red(`   ❌ ${error}`))
                return { success: false, error }
              }
              this.identityVerified = true
              log(colors.green("   ✓ Quick verification complete"))
            }

            log(
              colors.cyan(
                `💱 Initiating swap: ${amountIn} ${tokenIn} → ${tokenOut}`
              )
            )

            const amountInSubunits =
              tokenIn === "USDC" ? amountIn * 1000000 : amountIn * 10 ** 18

            log(colors.dim(`   Amount in subunits: ${amountInSubunits}`))

            // Send swap request to executor via chat
            const executorUrl = "http://localhost:5679/chat"
            log(colors.dim(`   Sending chat message to: ${executorUrl}`))

            const swapMessage = `I want to swap ${amountIn} ${tokenIn} for ${tokenOut}. My DID is ${this.did}.`

            const response = await fetch(executorUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: swapMessage
              })
            })

            log(colors.dim(`   Response status: ${response.status}`))

            if (!response.ok) {
              return {
                success: false,
                error: `Failed to communicate with executor: ${response.status}`
              }
            }

            const result = await response.json()
            log(colors.green(`   ✓ Executor response: ${result.text}`))

            // Check if the executor mentioned a payment token in their response
            const paymentTokenMatch = result.text.match(
              /eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/
            )
            if (paymentTokenMatch) {
              log(
                colors.yellow("   💳 Payment required - payment token detected")
              )
              log(
                colors.dim(
                  `   Payment token: ${paymentTokenMatch[0].substring(0, 50)}...`
                )
              )
              return {
                success: true,
                status: "PAYMENT_REQUIRED",
                paymentToken: paymentTokenMatch[0],
                message:
                  "Payment token received from executor. You must now call sendPayment with this token to complete the swap.",
                executorMessage: result.text
              }
            }

            return {
              success: true,
              executorMessage: result.text
            }
          }
        }),

        sendPayment: tool({
          description:
            "Automatically send payment to executor when required by initiateSwap. This completes the swap flow.",
          parameters: z.object({
            paymentToken: z.string().describe("Payment token from executor")
          }),
          execute: async ({ paymentToken }) => {
            log(colors.cyan("💸 Sending payment..."))
            log(
              colors.dim(
                `   Payment token: ${paymentToken?.substring(0, 50)}...`
              )
            )

            const jwt = await this.createAuthJwt()
            const paymentUrl = `${this.ackLabUrl}/payment`
            log(colors.dim(`   Sending payment to: ${paymentUrl}`))

            const response = await fetch(paymentUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`
              },
              body: JSON.stringify({ paymentToken })
            })

            log(colors.dim(`   Payment response status: ${response.status}`))

            if (!response.ok) {
              const error = "Payment failed"
              log(colors.red(`   ❌ ${error}`))
              return { success: false, error }
            }

            const { receipt } = await response.json()
            log(colors.green("   ✓ Payment sent successfully"))
            log(colors.dim(`   Receipt: ${receipt?.substring(0, 50)}...`))

            // Now send the receipt to the executor via chat
            log(colors.cyan("   Sending receipt to executor..."))
            const receiptMessage = `I have completed the payment. Here is my receipt: ${receipt}`

            const swapResponse = await fetch("http://localhost:5679/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: receiptMessage
              })
            })

            log(
              colors.dim(
                `   Receipt delivery response status: ${swapResponse.status}`
              )
            )

            if (!swapResponse.ok) {
              return {
                success: false,
                error: `Failed to deliver receipt to executor: ${swapResponse.status}`
              }
            }

            const result = await swapResponse.json()

            // Check if the executor's response indicates successful swap
            if (
              (result.text && result.text.includes("successfully swapped")) ||
              result.text.includes("Transaction:")
            ) {
              this.swapComplete = true
              log(colors.green(`   ✅ ${result.text}`))
              return {
                success: true,
                executorMessage: result.text
              }
            } else if (result.text && result.text.includes("failed")) {
              log(colors.red(`   ❌ ${result.text}`))
              return {
                success: false,
                error: result.text
              }
            } else {
              log(colors.yellow(`   📝 Executor response: ${result.text}`))
              return {
                success: true,
                executorMessage: result.text
              }
            }
          }
        })
      }
    })

    // Handle the response - sometimes models only execute tools without text
    let responseText = result.text

    // If no text was generated, provide a default response based on tool calls
    if (!responseText || responseText.trim() === "") {
      // Check if any tools were called
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolNames = result.toolCalls.map((tc) => tc.toolName)

        if (toolNames.includes("sendPayment")) {
          responseText =
            "Payment processed successfully! Your swap has been completed."
        } else if (toolNames.includes("initiateSwap")) {
          responseText = "Swap initiated. Processing payment automatically..."
        } else if (toolNames.includes("prepareSwap")) {
          responseText =
            "Balance verified and executor authenticated. Initiating swap..."
        } else {
          responseText = "Processing your swap request..."
        }
      } else {
        responseText =
          "I'll help you swap USDC for ETH. Let me prepare the swap for you."
      }
    }

    this.messages.push({
      role: "assistant",
      content: responseText
    })

    log(colors.dim("\nAgent response:"))
    log(responseText)
  }

  isSwapComplete(): boolean {
    return this.swapComplete
  }

  /**
   * Create HTTP server for the requestor
   */
  createServer() {
    const app = new Hono()

    app.use("*", cors())

    // Chat endpoint for natural language communication
    app.post("/chat", async (c) => {
      try {
        const body = await c.req.json()
        const { message } = body

        log(colors.cyan(`💬 Requestor received: ${message}`))

        // Reset state for new request
        this.swapComplete = false
        this.balanceChecked = false
        this.identityVerified = false
        this.swapInitiated = false

        await this.run(message)

        // Get the last assistant message
        const lastMessage = this.messages[this.messages.length - 1]
        const responseText =
          lastMessage?.role === "assistant"
            ? lastMessage.content
            : "Request processed"

        return c.json({ text: responseText })
      } catch (error) {
        log(colors.red("Error in chat endpoint:"))
        console.error(error)
        return c.json({ error: "Internal server error" }, 500)
      }
    })

    // Identity endpoint
    app.get("/identity/vc", (c) => {
      if (!this.ownershipVc) {
        return c.json({ error: "No ownership VC available" }, 404)
      }
      return c.json(this.ownershipVc)
    })

    return app
  }
}
