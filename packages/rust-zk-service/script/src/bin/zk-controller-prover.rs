use clap::Parser;
use dotenv::dotenv;
use sp1_sdk::{include_elf, ProverClient, SP1Stdin, HashableKey};
use std::path::PathBuf;
use tracing::info;
use hex;
use serde_json::json;
use sha2::{Sha256, Digest};

// Include the ELF binary for the controller claim circuit
// This should point to your program binary
pub const CONTROLLER_CLAIM_ELF: &[u8] = include_elf!("controller-claim-program");

#[derive(Clone, Debug, clap::ValueEnum, PartialEq)]
enum ProofSystem {
    None,
    Plonk,
    Groth16,
    Compressed
}

#[derive(Parser, Debug)]
#[clap(author, version, about = "ACK Controller Claim ZK Prover", long_about = None)]
struct Args {
    #[clap(long)]
    execute: bool,
    
    #[clap(long)]
    prove: bool,
    
    #[clap(long, value_enum, default_value = "none")]
    proof_system: ProofSystem,
    
    #[clap(long)]
    agent_did: String,
    
    #[clap(long)]
    controller_did: String,
    
    #[clap(long)]
    credential_signature: String, // Hex encoded
    
    #[clap(long)]
    credential_timestamp: u64,
    
    #[clap(long)]
    current_timestamp: Option<u64>, // Defaults to now if not provided
    
    #[clap(long)]
    output_proof: Option<PathBuf>,
    
    #[clap(long)]
    network: bool,
}

fn validate_arguments(args: &Args) -> Result<(), String> {
    if args.execute == args.prove {
        return Err("You must specify either --execute or --prove".to_string());
    }
    
    if args.agent_did.is_empty() {
        return Err("You must provide an agent DID with --agent-did".to_string());
    }
    
    if args.controller_did.is_empty() {
        return Err("You must provide a controller DID with --controller-did".to_string());
    }
    
    if args.prove && args.proof_system == ProofSystem::None {
        return Err("You must specify a proof system when using --prove".to_string());
    }
    
    Ok(())
}

fn hash_did(did: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(did.as_bytes());
    hasher.finalize().into()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    sp1_sdk::utils::setup_logger();
    
    let args = Args::parse();
    if let Err(err) = validate_arguments(&args) {
        eprintln!("Error: {}", err);
        std::process::exit(1);
    }

    println!("=== ACK Controller Claim Prover ===");
    println!("Agent DID: {}", args.agent_did);
    println!("Controller DID: [HIDDEN]"); // Don't print sensitive data
    println!("Credential Timestamp: {}", args.credential_timestamp);
    
    // Get current timestamp if not provided
    let current_timestamp = args.current_timestamp.unwrap_or_else(|| {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    });
    
    // Calculate expected agent DID hash (this is public)
    let expected_agent_did_hash = hash_did(&args.agent_did);
    
    // Decode credential signature from hex
    let credential_signature = hex::decode(&args.credential_signature)
        .map_err(|e| format!("Invalid credential signature hex: {}", e))?;
    
    // Prepare inputs for the zkVM
    let mut stdin = SP1Stdin::new();
    
    // Private inputs
    stdin.write(&args.agent_did);
    stdin.write(&args.controller_did);
    stdin.write(&credential_signature);
    stdin.write(&args.credential_timestamp);
    stdin.write(&current_timestamp);
    
    // Public inputs
    stdin.write(&expected_agent_did_hash);
    
    // Create prover client
    let client = ProverClient::from_env();
    if args.network {
        println!("Using SP1 Prover Network (SP1_PROVER=network)");
    } else {
        println!("Using local mode - make sure SP1_PROVER is set to 'cpu' or 'mock'");
    }

    if args.execute {
        println!("\n=== Executing Program ===");
        let (mut output, report) = client.execute(CONTROLLER_CLAIM_ELF, &stdin).run()?;
        info!("Program executed successfully with {} cycles", report.total_instruction_count());
        println!("Executed program with {} cycles!", report.total_instruction_count());
        
        let public_values = output.read::<Vec<u8>>();
        println!("Public values: 0x{}", hex::encode(&public_values));
        
        // Parse and display the results
        println!("\n=== Results ===");
        if public_values.len() >= 97 { // 32 + 32 + 1 + 32 + 1 = 98 bytes minimum
            let agent_did_hash = &public_values[0..32];
            let controller_commitment = &public_values[32..64];
            let has_valid_controller = public_values[64] == 1;
            let credential_timestamp = u64::from_be_bytes([
                public_values[65], public_values[66], public_values[67], public_values[68],
                public_values[69], public_values[70], public_values[71], public_values[72]
            ]);
            let is_expired = public_values[73] == 1;
            
            println!("Agent DID Hash: 0x{}", hex::encode(agent_did_hash));
            println!("Controller Commitment: 0x{}", hex::encode(controller_commitment));
            println!("Has Valid Controller: {}", has_valid_controller);
            println!("Credential Timestamp: {}", credential_timestamp);
            println!("Is Expired: {}", is_expired);
        }
    } else {
        println!("\n=== Generating Proof ===");
        let (pk, vk) = client.setup(CONTROLLER_CLAIM_ELF);
        println!("Proof System Selected: {:?}", args.proof_system);
        
        let proof = match args.proof_system {
            ProofSystem::Plonk => client.prove(&pk, &stdin).plonk().run(),
            ProofSystem::Groth16 => client.prove(&pk, &stdin).groth16().run(),
            ProofSystem::Compressed => client.prove(&pk, &stdin).compressed().run(),
            ProofSystem::None => {
                return Err("Cannot generate proof without specifying a proof system".into());
            }
        }?;
        
        let public_values = proof.public_values.as_slice();
        println!("public values: 0x{}", hex::encode(public_values));
        
        // Get the proof as bytes
        let solidity_proof = proof.bytes();
        println!("proof: 0x{}", hex::encode(&solidity_proof));
        
        // Save the proof
        let proof_path = if let Some(output_path) = &args.output_proof {
            proof.save(output_path)?;
            output_path.to_string_lossy().to_string()
        } else {
            let default_path = format!("controller_claim_proof_{}.bin", 
                chrono::Utc::now().timestamp());
            proof.save(&default_path)?;
            default_path
        };
        
        println!("Proof saved to: {}", proof_path);
        
        // Verify the proof
        client.verify(&proof, &vk)?;
        println!("Verification key: {:?}", vk.bytes32_raw());
        println!("Proof verified successfully!");
        
        // Parse the public values for output
        if public_values.len() >= 73 {
            let agent_did_hash = &public_values[0..32];
            let controller_commitment = &public_values[32..64];
            let has_valid_controller = public_values[64] == 1;
            let credential_timestamp_bytes = &public_values[65..73];
            let credential_timestamp = u64::from_be_bytes([
                credential_timestamp_bytes[0], credential_timestamp_bytes[1], 
                credential_timestamp_bytes[2], credential_timestamp_bytes[3],
                credential_timestamp_bytes[4], credential_timestamp_bytes[5], 
                credential_timestamp_bytes[6], credential_timestamp_bytes[7]
            ]);
            let is_expired = if public_values.len() > 73 { 
                public_values[73] == 1 
            } else { 
                false 
            };
            
            // Create output JSON for TypeScript integration
            let result_json = json!({
                "publicValues": {
                    "agentDidHash": hex::encode(agent_did_hash),
                    "controllerCommitment": hex::encode(controller_commitment),
                    "hasValidController": has_valid_controller,
                    "credentialTimestamp": credential_timestamp,
                    "isExpired": is_expired
                },
                "proof": {
                    "data": hex::encode(&solidity_proof),
                    "verificationKey": hex::encode(vk.bytes32_raw()),
                    "proofPath": proof_path,
                    "proofSystem": format!("{:?}", args.proof_system).to_lowercase()
                },
                "metadata": {
                    "generatedAt": chrono::Utc::now().to_rfc3339(),
                    "proverVersion": env!("CARGO_PKG_VERSION"),
                    "network": args.network
                }
            });
            
            // Save result JSON
            let result_path = proof_path.replace(".bin", "_result.json");
            std::fs::write(&result_path, serde_json::to_string_pretty(&result_json)?)?;
            println!("\nResult JSON saved to: {}", result_path);
            
            // Print summary
            println!("\n=== Proof Summary ===");
            println!("✓ Agent DID verified (hash: 0x{}...)", &hex::encode(agent_did_hash)[..8]);
            println!("✓ Controller commitment: 0x{}...", &hex::encode(controller_commitment)[..8]);
            println!("✓ Valid controller: {}", has_valid_controller);
            println!("✓ Credential age: {} days", 
                (current_timestamp - credential_timestamp) / (24 * 60 * 60));
            println!("✓ Status: {}", if is_expired { "EXPIRED" } else { "ACTIVE" });
        }
    }

    Ok(())
}