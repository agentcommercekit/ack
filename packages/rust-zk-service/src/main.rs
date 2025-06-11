use axum::{
    routing::post,
    Router,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sp1_sdk::{ProverClient, SP1Stdin, include_elf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const CONTROLLER_CLAIM_ELF: &[u8] = include_elf!("controller-claim-program");

#[derive(Debug, Deserialize)]
struct ControllerClaimRequest {
    agent_did: String,
    controller_did: String,
    credential_signature: String,
    credential_timestamp: u64,
}

#[derive(Debug, Serialize)]
struct ControllerClaimResponse {
    proof: String,
    public_values: PublicValues,
}

#[derive(Debug, Serialize)]
struct PublicValues {
    agent_did_hash: String,
    controller_commitment: String,
    has_valid_controller: bool,
    credential_timestamp: u64,
    is_expired: bool,
}

async fn generate_controller_proof(
    Json(request): Json<ControllerClaimRequest>,
) -> Result<Json<ControllerClaimResponse>, StatusCode> {
    let client = ProverClient::from_env();
    
    let mut stdin = SP1Stdin::new();
    
    stdin.write(&request.agent_did);
    stdin.write(&request.controller_did);
    stdin.write(&hex::decode(&request.credential_signature).unwrap());
    stdin.write(&request.credential_timestamp);
    
    // Current timestamp
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    stdin.write(&current_time);
    
    // Public input: agent DID hash
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(request.agent_did.as_bytes());
    let agent_did_hash: [u8; 32] = hasher.finalize().into();
    stdin.write(&agent_did_hash);
    
    // Generate proof
    let (pk, _vk) = client.setup(CONTROLLER_CLAIM_ELF);
    let proof = client.prove(&pk, &stdin)
        .compressed()
        .run()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Parse public values
    let public_bytes = proof.public_values.as_slice();
    
    // Extract values (simplified parsing)
    let response = ControllerClaimResponse {
        proof: hex::encode(proof.bytes()),
        public_values: PublicValues {
            agent_did_hash: hex::encode(&agent_did_hash),
            controller_commitment: hex::encode(&public_bytes[32..64]),
            has_valid_controller: public_bytes[95] == 1,
            credential_timestamp: request.credential_timestamp,
            is_expired: public_bytes[159] == 1,
        },
    };
    
    Ok(Json(response))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/prove/controller-claim", post(generate_controller_proof));
    
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();
    
    println!("ZK Service running on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}