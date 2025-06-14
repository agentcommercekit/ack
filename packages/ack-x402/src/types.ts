import type { DidUri } from "@agentcommercekit/did";
import type { JwtString } from "@agentcommercekit/jwt";
import type { Keypair } from "@agentcommercekit/keys";

export interface ACK0x402Config {
  receivingAddress: string;
  routes: Record<string, any>;
  facilitator: any;
  enableIdentity?: boolean;
  enableReceipts?: boolean;
  serviceIdentity?: {
    did: DidUri;
    privateKey: string | Keypair;  // Accept both string and Keypair
  };
}

export interface ACK0x402ClientConfig {
  account: any;
  identity?: {
    did: DidUri;
    privateKey: string | Keypair;  // Accept both string and Keypair
  };
}
