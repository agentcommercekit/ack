import {
  colors,
  confirm,
  demoFooter,
  demoHeader,
  input,
  link,
  log,
  logJson,
  sectionHeader,
  select,
  updateEnvFile,
  waitForEnter,
} from "@repo/cli-tools"
import {
  createJwt,
  getDidResolver,
  parseJwtCredential,
  type DidUri,
} from "agentcommercekit"
import path, { dirname } from "path"
import { fileURLToPath } from "url"

import { ClientAgent } from "./client-agent"
import { CredentialIssuer } from "./credential-issuer"
import { CredentialVerifier } from "./credential-verifier"
import { providerKeySet } from "./get-model"
import { HaikuAgent } from "./haiku-agent"
import { createOwner, type Owner } from "./owner"
import { serveAgent } from "./serve-agent"

const currentDir = dirname(fileURLToPath(import.meta.url))

const resolver = getDidResolver()

const welcomeMessage = `${colors.bold("\n🔐 Welcome to the Agent Commerce Kit Identity (ACK-ID) Demo! 🔐")}
This interactive demo will guide you through the fundamental concepts of ACK-ID.  We'll demonstrate how to establish verifiable identities for AI agents and their owners, and how agents can securely verify each other's identities before interacting.

ACK-ID uses well-established ${colors.bold("W3C Standards")} to provide secure, verifiable identity to AI agents. Using ${colors.bold("Decentralized Identifiers (DIDs)")} and ${colors.bold("Verifiable Credentials (VCs)")}, agents can prove their identity and provide provable claims of their capabilities and authorized access.

Press Enter at each step to continue.
`

const credentialIssuer = await CredentialIssuer.create({
  baseUrl: "https://issuer.example.com",
  resolver,
})

const credentialVerifier = await CredentialVerifier.create({
  baseUrl: "https://verifier.example.com",
  resolver,
  trustedIssuers: [credentialIssuer.did],
})

async function createOwnershipVc(agentDid: DidUri, owner: Owner) {
  const payload = {
    controller: owner.did,
    subject: agentDid,
  }
  const signedPayload = await createJwt(
    payload,
    {
      issuer: owner.did,
      signer: owner.signer,
    },
    {
      alg: owner.algorithm,
    },
  )

  return credentialIssuer.issueAgentOwnershipVc(signedPayload)
}

async function promptForProviderKey() {
  log(
    colors.yellow(
      "\nNOTE: An Anthropic or OpenAI API key is required to simulate agent interaction. Please select an option below:",
    ),
  )

  const selection = await select({
    message: colors.white("Select a provider:"),
    choices: [
      { value: "anthropic", name: "Anthropic" },
      { value: "openai", name: "OpenAI" },
      { value: "exit", name: "Exit" },
    ],
  })

  if (selection === "exit") {
    process.exit(0)
  }

  const apiKey = await input({ message: colors.white("Enter your API key:") })

  const storeInEnv = await confirm({
    message: colors.white(
      "Store in the .env file to skip this step in the future?",
    ),
  })

  const envKey =
    selection === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"

  process.env[envKey] = apiKey

  if (storeInEnv) {
    await updateEnvFile(
      { [envKey]: apiKey },
      path.resolve(currentDir, "..", ".env"),
    )
  }
}
/**
 * Main function that orchestrates the entire flow
 */
async function main() {
  console.clear()
  log(demoHeader("ACK-ID Demo"), { wrap: false })
  log(welcomeMessage)

  await waitForEnter()

  log(
    sectionHeader("📝 Creating Identity for Agent Owner 1 (Client Owner)", {
      step: 1,
    }),
  )
  log(
    colors.dim(
      "First, we need an 'Owner'. In ACK-ID, an Owner is the human or legal entity ultimately responsible for an agent's actions. In this example, the agent will have a direct relationship with their owner, but in practice there may be a chain of ownership. We'll create an Owner identity using a Decentralized Identifier (DID). A DID is a globally unique ID that the owner controls, not issued by a central authority. Associated with the DID is a DID Document, which contains public keys for verification.",
    ),
  )

  const clientOwner = await createOwner()
  resolver.addToCache(clientOwner.did, clientOwner.didDocument)

  log(
    `\n✨ Agent Owner 1 (Client Owner) Created! ✨

Owner DID (Unique Identifier):`,
  )
  log(colors.dim(clientOwner.did), { wrap: false })
  log(
    colors.italic(
      "\n  This is the unique, self-sovereign identifier for our first agent owner.\n",
    ),
  )
  log("Owner DID Document (Public Keys & Metadata):")
  logJson(clientOwner.didDocument as Record<string, unknown>, colors.magenta)
  log(
    colors.italic(
      "\n  This document contains cryptographic public keys that allow others to verify signatures made by this owner.",
    ),
  )

  await waitForEnter()

  log(
    sectionHeader("🤖 Creating Client Agent (Owned by Owner 1)", {
      step: 2,
    }),
  )
  log(
    colors.dim(
      `${colors.bold("Creating a new Client Agent with its own DID")}

This step creates a new Client Agent with its own DID. The Client Agent will be owned by Owner 1, establishing a hierarchical relationship where the owner has control over the agent.

The Client Agent DID Document will have a "controller" field that links to the Owner's DID. The provable ownership relationship will be formalized through a Verifiable Credential in the next step.

In this example, the Client Agent will have their DID hosted on a locally-running server (localhost:5678).
`,
    ),
  )

  const clientAgent = await ClientAgent.create({
    resolver,
    baseUrl: "http://localhost:5678",
    ownerDid: clientOwner.did,
    verifier: credentialVerifier,
  })

  log(
    `\n✨ Client Agent Created! ✨

Client Agent DID (Unique Identifier for the Agent):`,
  )
  log(colors.dim(clientAgent.did), { wrap: false })
  log(
    colors.italic(
      "\n  This is the unique identifier for the client agent itself.",
    ),
  )
  log("Client Agent DID Document (Agent's Public Keys & Metadata):")
  logJson(clientAgent.didDocument as Record<string, unknown>, colors.magenta)
  log(
    colors.italic(
      "\n  This document allows the client agent to prove its identity and sign messages.",
    ),
  )

  await waitForEnter()

  log(
    sectionHeader(
      "🎫 Issuing Ownership Verifiable Credential (VC) for Client Agent",
      {
        step: 3,
      },
    ),
  )
  log(
    colors.dim(
      `${colors.bold("Owner 1 issues a VC to Client Agent")}

In this step, Owner 1 issues a Verifiable Credential to the Client Agent, formally establishing the ownership relationship. This VC is cryptographically signed by Owner 1 and contains claims about the ownership relationship. The Client Agent can present this VC to prove its ownership status.`,
    ),
  )

  const clientOwnershipVc = await createOwnershipVc(
    clientAgent.did,
    clientOwner,
  )
  clientAgent.setOwnershipVc(clientOwnershipVc)

  log(
    `\n✨ Client Agent Ownership VC Issued! ✨

Client Agent Ownership Credential (Proof of Ownership):`,
  )
  const parsedClientOwnershipVc =
    typeof clientOwnershipVc === "string"
      ? await parseJwtCredential(clientOwnershipVc, resolver)
      : clientOwnershipVc
  logJson(parsedClientOwnershipVc, colors.magenta)
  log(
    colors.italic(
      "\n  Notice the 'issuer' is Owner 1's DID, and the 'credentialSubject' links to the Client Agent's DID.\n  The 'proof' section contains the digital signature from Owner 1.",
    ),
  )

  await waitForEnter()

  log(
    sectionHeader("🔄 Repeating for Server Agent & Owner 2", {
      step: 4,
    }),
  )
  log(
    colors.dim(
      `${colors.bold("Creating Owner 2 and Server Agent")}

This step repeats the process for a second owner (Owner 2) and a Server Agent. The Server Agent will be owned by Owner 2, creating a parallel structure to the Client Agent and Owner 1 relationship. This demonstrates how multiple agents can be created and owned by different entities.`,
    ),
  )

  await waitForEnter("Press Enter to create Server Agent Owner (Owner 2)...")

  const serverOwner = await createOwner()
  resolver.addToCache(serverOwner.did, serverOwner.didDocument)

  log(
    `\n✨ Agent Owner 2 (Server Owner) Created! ✨

Owner DID (Unique Identifier):`,
  )
  log(colors.dim(serverOwner.did), { wrap: false })
  log(
    colors.italic("\n  Another unique DID, this time for the server's owner."),
  )
  log("Owner DID Document (Public Keys & Metadata):")
  logJson(serverOwner.didDocument as Record<string, unknown>, colors.magenta)

  await waitForEnter("Press Enter to create Server Agent...")

  log(
    colors.dim(
      `Creating the Server Agent (HaikuAgent), which will be owned by Owner 2.
Similar to the Client Agent, we provide:
${colors.italic("  - resolver: The same DID resolver instance.")}
${colors.italic("  - baseUrl: A different network address for this server agent (it will run on a different port).")}
${colors.italic("  - ownerDid: The DID of Owner 2, establishing its ownership.")}
${colors.italic("  - verifier: The same credential verifier, so it shares the same trust policies (e.g., trusted issuers).")}`,
    ),
  )

  const serverAgent = await HaikuAgent.create({
    resolver,
    baseUrl: "http://localhost:5679",
    ownerDid: serverOwner.did,
    verifier: credentialVerifier,
  })

  log(
    `\n✨ Server Agent Created! ✨

Server Agent DID (Unique Identifier for the Agent):`,
  )
  log(colors.dim(serverAgent.did), { wrap: false })
  log(
    colors.italic(
      "\n  The Server Agent gets its own distinct DID and DID Document.",
    ),
  )
  log("Server Agent DID Document (Agent's Public Keys & Metadata):")
  logJson(serverAgent.didDocument as Record<string, unknown>, colors.magenta)

  await waitForEnter(
    "Press Enter to issue Server Agent Ownership Credential...",
  )

  const serverOwnershipVc = await createOwnershipVc(
    serverAgent.did,
    serverOwner,
  )
  serverAgent.setOwnershipVc(serverOwnershipVc)

  log(
    `\n✨ Server Agent Ownership VC Issued! ✨

Server Agent Ownership Credential (Proof of Ownership):`,
  )
  const parsedServerOwnershipVc =
    typeof serverOwnershipVc === "string"
      ? await parseJwtCredential(serverOwnershipVc, resolver)
      : serverOwnershipVc
  logJson(parsedServerOwnershipVc, colors.magenta)
  log(
    colors.italic(
      "\n  Similar to the client's VC, this links Server Agent to Owner 2.",
    ),
  )

  await waitForEnter()

  log(
    sectionHeader("🤝 Agent-to-Agent Communication & Verification", {
      step: 5,
    }),
  )

  log(
    colors.dim(
      `${colors.bold("Establishing trust between agents")}

In this final step, we demonstrate how agents can verify each other's credentials and establish trust. The Client Agent and Server Agent can verify each other's ownership VCs, ensuring they are interacting with legitimate agents owned by trusted entities. This verification process is crucial for secure agent-to-agent communication.`,
    ),
  )

  if (!providerKeySet) {
    await promptForProviderKey()
  }

  await waitForEnter(
    "Press Enter to start the agents and initiate communication...",
  )

  serveAgent({ port: 5678, agent: clientAgent })
  serveAgent({ port: 5679, agent: serverAgent })

  let result = ""
  while (!clientAgent.haikuComplete) {
    result = await clientAgent.run(
      "Begin or continue generating a haiku about the ocean",
    )
  }

  log(colors.yellow("\nFinal agent response:"), colors.green(result))

  log(
    colors.bold(colors.magenta("\n🎉 === ACK-ID Demo Complete === 🎉\n")),
    colors.yellow(
      `This demo was created by Catena Labs. For more information on ACK-Pay and other tools for the agent economy, please visit ${link("https://www.agentcommercekit.com")} 🌐.`,
    ),
    demoFooter("Thank You!"),
    { wrap: false },
  )
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0)
  })
