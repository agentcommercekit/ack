#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::{SolType, sol};
use sha2::{Sha256, Digest};

// Public values structure
sol! {
    struct ControllerClaimProof {
        bytes32 agent_did_hash;           // Hash of agent's DID
        bytes32 controller_commitment;     // Commitment to controller's DID
        bool has_valid_controller;         // Whether controller relationship is valid
        uint256 credential_timestamp;      // When credential was issued
        bool is_expired;                  // Whether credential is expired
    }
}

fn main() {
    // Private inputs
    let agent_did = sp1_zkvm::io::read::<String>();
    let controller_did = sp1_zkvm::io::read::<String>();
    let credential_signature = sp1_zkvm::io::read::<Vec<u8>>();
    let credential_timestamp = sp1_zkvm::io::read::<u64>();
    let current_timestamp = sp1_zkvm::io::read::<u64>();
    
    // Public inputs
    let expected_agent_did_hash = sp1_zkvm::io::read::<[u8; 32]>();
    
    // Verify agent DID matches
    let mut hasher = Sha256::new();
    hasher.update(agent_did.as_bytes());
    let agent_did_hash_bytes: [u8; 32] = hasher.finalize().into();
    
    assert_eq!(agent_did_hash_bytes, expected_agent_did_hash, "Agent DID mismatch");
    
    // Create controller commitment (hash of controller DID)
    let mut hasher = Sha256::new();
    hasher.update(controller_did.as_bytes());
    let controller_commitment_bytes: [u8; 32] = hasher.finalize().into();
    
    // Verify credential signature (simplified - in reality would verify actual signature)
    let has_valid_controller = !credential_signature.is_empty() && 
                               !controller_did.is_empty();
    
    // Check expiration (credentials valid for 90 days)
    let expiry_period = 90 * 24 * 60 * 60; // 90 days in seconds
    let is_expired = current_timestamp > (credential_timestamp + expiry_period);
    
    // Import the correct types
    use alloy_sol_types::private::{FixedBytes, Uint};
    
    // Convert arrays to FixedBytes and u64 to Uint<256, 4>
    let agent_did_hash = FixedBytes::from(agent_did_hash_bytes);
    let controller_commitment = FixedBytes::from(controller_commitment_bytes);
    let credential_timestamp_u256 = Uint::<256, 4>::from(credential_timestamp);
    
    // Create public proof values
    let proof = ControllerClaimProof {
        agent_did_hash,
        controller_commitment,
        has_valid_controller,
        credential_timestamp: credential_timestamp_u256,
        is_expired,
    };
    
    // Commit public values
    let encoded = ControllerClaimProof::abi_encode(&proof);
    sp1_zkvm::io::commit_slice(&encoded);
}