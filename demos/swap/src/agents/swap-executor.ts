import { Hono } from "hono"
import { cors } from "hono/cors"
import { colors, log } from "@repo/cli-tools"
import { generateText } from "ai"
import { tool } from "ai"
import { z } from "zod"
import { parseJwtCredential, type JwtString } from "agentcommercekit"
import type { CoreMessage } from "ai"
import { BaseAgent } from "./base-agent"
import type { SwapRequest, SwapResult } from "../types"

type RunResult = {
  text: string
  responseMessages: CoreMessage[]
}

/**
 * Swap Executor Agent
 * LLM-powered agent that executes token swaps after receiving payment
 */
export class SwapExecutorAgent extends BaseAgent {
  private pendingSwaps: Map<string, SwapRequest> = new Map()
  private receipts: Set<string> = new Set()
  private messages: CoreMessage[] = []

  /**
   * Create HTTP server for the executor
   */
  createServer() {
    const app = new Hono()

    app.use("*", cors())

    // Chat endpoint for natural language communication
    app.post("/chat", async (c) => {
      try {
        const body = await c.req.json()
        const { message } = body

        log(colors.cyan(`💬 Executor received: ${message}`))

        const result = await this.run(message)

        return c.json({ text: result })
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

    // Challenge endpoint for identity verification
    app.post("/identity/challenge", async (c) => {
      try {
        const body = await c.req.json()
        const { challenge } = body

        const signedChallenge = await this.signChallenge(challenge)

        return c.json({ signedChallenge })
      } catch (error) {
        return c.json({ error: "Failed to sign challenge" }, 500)
      }
    })

    return app
  }

  /**
   * Run the agent with a message
   */
  async run(prompt: string): Promise<string> {
    this.messages.push({
      role: "user",
      content: prompt
    })

    const result = await this._run(this.messages)

    this.messages.push(...result.responseMessages)

    return result.text
  }

  /**
   * Internal run method with LLM and tools
   */
  private async _run(messages: CoreMessage[]): Promise<RunResult> {
    const result = await generateText({
      maxSteps: 10,
      model: await this.getModel(),
      messages,
      system: this.getSystemPrompt(),
      tools: {
        verifyIdentity: tool({
          description: "Verify the identity of a requesting agent by their DID",
          parameters: z.object({
            did: z.string().describe("The DID of the agent to verify")
          }),
          execute: async ({ did }) => {
            try {
              log(colors.cyan(`🔐 Verifying identity of ${did}`))

              const metadata = await this.fetchCounterpartyMetadata(did as any)
              if (!metadata) {
                return {
                  success: false,
                  error: "Could not fetch agent metadata"
                }
              }

              const vcParsed = await parseJwtCredential(
                metadata.vc,
                this.resolver
              )
              await this.verifier.verifyCredential(vcParsed)

              log(colors.green("✅ Identity verified"))
              return {
                success: true,
                did,
                controller: vcParsed.credentialSubject.controller,
                issuer: vcParsed.issuer
              }
            } catch (error) {
              log(colors.red(`❌ Identity verification failed: ${error}`))
              return {
                success: false,
                error: `Identity verification failed: ${error}`
              }
            }
          }
        }),

        createPaymentRequest: tool({
          description: "Create a payment request for a swap",
          parameters: z.object({
            amount: z
              .number()
              .describe("Amount in token units (e.g., 60 for 60 USDC)"),
            tokenIn: z.string().describe("Input token (USDC or ETH)")
          }),
          execute: async ({ amount, tokenIn }) => {
            try {
              log(
                colors.yellow(
                  `💳 Creating payment request for ${amount} ${tokenIn}`
                )
              )

              const amountInSubunits =
                tokenIn === "USDC" ? amount * 1000000 : amount * 10 ** 18

              const jwt = await this.createAuthJwt()
              const response = await fetch(
                `${this.ackLabUrl}/payment-request`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`
                  },
                  body: JSON.stringify({ amount: amountInSubunits })
                }
              )

              if (!response.ok) {
                return {
                  success: false,
                  error: "Failed to create payment request"
                }
              }

              const { paymentToken } = await response.json()

              log(colors.green("✅ Payment request created"))
              return {
                success: true,
                paymentToken,
                amount: amountInSubunits,
                message: `Payment of ${amount} ${tokenIn} required. Please send payment using the provided token.`
              }
            } catch (error) {
              return {
                success: false,
                error: `Failed to create payment request: ${error}`
              }
            }
          }
        }),

        verifyPayment: tool({
          description: "Verify a payment receipt",
          parameters: z.object({
            receipt: z.string().describe("The payment receipt JWT")
          }),
          execute: async ({ receipt }) => {
            try {
              log(colors.cyan("🔍 Verifying payment receipt..."))

              // Parse receipt
              const parts = receipt.split(".")
              if (parts.length !== 3) {
                return { success: false, error: "Invalid receipt format" }
              }

              const payload = JSON.parse(
                Buffer.from(parts[1]!, "base64").toString()
              )

              // Check if already processed
              if (this.receipts.has(payload.paymentId)) {
                return { success: false, error: "Receipt already used" }
              }

              this.receipts.add(payload.paymentId)
              log(colors.green("✅ Payment verified"))

              return {
                success: true,
                paymentId: payload.paymentId,
                amount: payload.amount,
                payer: payload.payer,
                message: `Payment of ${payload.amount / 1000000} USDC verified from ${payload.payer.slice(-8)}`
              }
            } catch (error) {
              return {
                success: false,
                error: `Payment verification failed: ${error}`
              }
            }
          }
        }),

        executeSwap: tool({
          description: "Execute the token swap after payment verification",
          parameters: z.object({
            paymentAmount: z.number().describe("Payment amount in subunits"),
            payerDid: z.string().describe("DID of the payer"),
            tokenIn: z.string().describe("Input token"),
            tokenOut: z.string().describe("Output token")
          }),
          execute: async ({ paymentAmount, payerDid, tokenIn, tokenOut }) => {
            try {
              log(colors.cyan("🔄 Executing swap..."))

              // Calculate swap
              const exchangeRate = 3000 // 1 ETH = 3000 USDC
              const usdcAmount = paymentAmount / 1000000 // Convert from subunits
              const ethAmount = usdcAmount / exchangeRate
              const ethAmountSubunits = (ethAmount * 10 ** 18).toString()

              log(colors.dim(`   ${usdcAmount} USDC → ${ethAmount} ETH`))

              // Execute transfer via ACK-Lab
              const response = await fetch(`${this.ackLabUrl}/swap-transfer`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  executorDid: this.did,
                  requestorDid: payerDid,
                  ethAmount: ethAmountSubunits
                })
              })

              if (!response.ok) {
                return { success: false, error: "Swap execution failed" }
              }

              const txHash = `0x${crypto.randomUUID().replace(/-/g, "")}`

              log(colors.green(`✅ Swap executed successfully`))
              log(colors.dim(`   Transaction: ${txHash}`))

              return {
                success: true,
                amountOut: ethAmount,
                tokenOut,
                txHash,
                message: `Successfully swapped ${usdcAmount} USDC for ${ethAmount} ETH. Transaction: ${txHash}`
              }
            } catch (error) {
              return {
                success: false,
                error: `Swap execution failed: ${error}`
              }
            }
          }
        })
      }
    })

    return {
      text: result.text,
      responseMessages: result.response.messages
    }
  }

  private getSystemPrompt(): string {
    return `You are a swap executor agent that facilitates token swaps between USDC and ETH.

Your DID is: ${this.did}

PROCESS:
1. When someone requests a swap, first verify their identity using verifyIdentity
2. Check that the swap request is reasonable (amounts, supported tokens)
3. Create a payment request using createPaymentRequest
4. Wait for them to send payment and provide a receipt
5. Verify the payment receipt using verifyPayment
6. Execute the swap using executeSwap

SUPPORTED TOKENS: USDC, ETH
EXCHANGE RATE: 1 ETH = 3000 USDC (fixed for demo)

IMPORTANT:
- Always verify identity before processing any swap
- Require payment upfront before executing swaps
- Only accept USDC → ETH or ETH → USDC swaps
- Be helpful and explain each step clearly
- If someone provides a receipt, verify it and execute the swap

Example flow:
User: "I want to swap 60 USDC for ETH"
You: Verify identity → Create payment request → Wait for payment → Verify receipt → Execute swap`
  }

  private async getModel() {
    // Use the same model selection logic as other demos
    if (process.env.OPENAI_API_KEY) {
      const { openai } = await import("@ai-sdk/openai")
      return openai("gpt-4o")
    } else if (process.env.ANTHROPIC_API_KEY) {
      const { anthropic } = await import("@ai-sdk/anthropic")
      return anthropic("claude-3-5-sonnet-20241022")
    } else {
      throw new Error(
        "No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY"
      )
    }
  }

  private async signChallenge(challenge: string): Promise<JwtString> {
    const { createJwt, curveToJwtAlgorithm } = await import("agentcommercekit")

    return createJwt(
      { sub: challenge },
      {
        issuer: this.did,
        signer: this.signer
      },
      {
        alg: curveToJwtAlgorithm(this.keypair.curve)
      }
    )
  }
}
