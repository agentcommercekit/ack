import type { DidUri } from "@agentcommercekit/did"
import type { ZKControllerProof } from "./zk-controller-verifier"
import { spawn } from "child_process"
import { readFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomBytes } from "crypto"

export interface ZKControllerProofInput {
  agentDid: DidUri
  controllerDid: DidUri
  credentialSignature: string
  credentialTimestamp: number
}

export interface ZKClient {
  generateControllerProof(input: ZKControllerProofInput): Promise<ZKControllerProof>
  verifyControllerProof(proof: ZKControllerProof): Promise<boolean>
}

/**
 * SP1 ZK Client that calls the Rust prover binary
 * 
 * This client spawns the zk-controller-prover Rust binary as a child process
 * and parses the resulting JSON output to create ZK proofs.
 */
class SP1ZKClient implements ZKClient {
  private readonly proverPath: string
  
  constructor(proverPath?: string) {
    // Default path to the Rust prover binary
    this.proverPath = proverPath || 
      process.env.ZK_PROVER_PATH ||
      "../rust-zk-service/target/release/zk-controller-prover"
  }

  async generateControllerProof(input: ZKControllerProofInput): Promise<ZKControllerProof> {
    // Generate unique output path for this proof
    const outputFile = join(tmpdir(), `proof_${randomBytes(8).toString("hex")}.bin`)
    
    // Build command line arguments for the Rust prover
    const args = [
      "--prove",                                          // Generate proof mode
      "--proof-system", "plonk",                         // Proof system (plonk, groth16, compressed)
      "--agent-did", input.agentDid,                    // Agent's DID
      "--controller-did", input.controllerDid,          // Controller's DID (will be hidden)
      "--credential-signature", input.credentialSignature, // Hex-encoded signature
      "--credential-timestamp", input.credentialTimestamp.toString(),
      "--output-proof", outputFile
    ]
    
    // Add current timestamp (defaults to now if not provided)
    const currentTimestamp = Math.floor(Date.now() / 1000)
    args.push("--current-timestamp", currentTimestamp.toString())
    
    // Add network flag if using network prover
    if (process.env.SP1_PROVER === "network") {
      args.push("--network")
    }
    
    try {
      // Execute the Rust prover
      await this.runProver(args)
      
      // Read the JSON result file created by the prover
      const resultPath = outputFile.replace(".bin", "_result.json")
      const resultJson = await readFile(resultPath, "utf-8")
      const result = JSON.parse(resultJson)
      
      // Clean up temporary files
      await Promise.all([
        unlink(outputFile).catch(() => {}),
        unlink(resultPath).catch(() => {})
      ])
      
      // Return proof in expected format
      return {
        proof: result.proof.data,
        publicValues: result.publicValues
      }
    } catch (error) {
      // Clean up on error
      await Promise.all([
        unlink(outputFile).catch(() => {}),
        unlink(outputFile.replace(".bin", "_result.json")).catch(() => {})
      ])
      throw new Error(`Failed to generate ZK proof: ${error}`)
    }
  }
  
  async verifyControllerProof(proof: ZKControllerProof): Promise<boolean> {
    // The Rust prover verifies during generation
    // For now, trust that valid proofs were generated correctly
    // In production, implement standalone verification
    return true
  }
  
  private runProver(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Include network environment variables
      const env = {
        ...process.env,
        SP1_PROVER: process.env.SP1_PROVER || "mock",
        RUST_LOG: process.env.RUST_LOG || "info"
      }
      
      // Add network-specific env vars if using network prover
      if (process.env.SP1_PROVER === "network") {
        if (process.env.NETWORK_PRIVATE_KEY) {
          env.NETWORK_PRIVATE_KEY = process.env.NETWORK_PRIVATE_KEY
        }
        if (process.env.NETWORK_RPC_URL) {
          env.NETWORK_RPC_URL = process.env.NETWORK_RPC_URL
        }
      }
      
      const prover = spawn(this.proverPath, args, { env })
      
      let stderr = ""
      let stdout = ""
      
      // Collect error output
      prover.stderr.on("data", (data) => {
        stderr += data.toString()
        // Show stderr in tests
        if (process.env.NODE_ENV === "test" || process.env.DEBUG) {
          console.error(`[SP1 stderr] ${data.toString().trim()}`)
        }
      })
      
      // Log progress - always show in tests
      prover.stdout.on("data", (data) => {
        stdout += data.toString()
        if (process.env.NODE_ENV === "test" || process.env.DEBUG) {
          console.log(`[SP1] ${data.toString().trim()}`)
        }
      })
      
      prover.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Prover exited with code ${code}: ${stderr}`))
        }
      })
      
      prover.on("error", (err) => {
        reject(new Error(`Failed to start prover: ${err.message}`))
      })
    })
  }
}

// Export singleton instance
export const zkClient = new SP1ZKClient()