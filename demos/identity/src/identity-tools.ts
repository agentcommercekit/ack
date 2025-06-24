import { valibotSchema } from "@ai-sdk/valibot"
import { colors } from "@repo/cli-tools"
import { resolveDid, verifyJwt } from "agentcommercekit"
import { credentialSchema } from "agentcommercekit/schemas/zod"
import { tool } from "ai"
import * as v from "valibot"
import type { CredentialVerifier } from "./credential-verifier"
import type { DidResolver, DidUri } from "agentcommercekit"

const challengeResponseSchema = v.object({
  signedChallenge: v.string()
})

type IdentityToolsParams = {
  resolver: DidResolver
  verifier: CredentialVerifier
}

async function verifyIdentity(
  did: DidUri,
  resolver: DidResolver,
  verifier: CredentialVerifier
) {
  const didResolution = await resolveDid(did, resolver)

  // Extract the identity service endpoint from the DID document
  const identityService = didResolution.didDocument.service?.find(
    (s) => s.type === "IdentityService"
  )

  if (!identityService) {
    throw new Error("Agent has no identity service configured")
  }

  const identityServiceEndpoint = identityService.serviceEndpoint
  if (typeof identityServiceEndpoint !== "string") {
    throw new Error("Identity service endpoint is not a string")
  }

  // Generate a random challenge and have the other agent sign it to prove DID ownership
  const challenge = crypto.randomUUID()

  const challengeResponse = await fetch(
    `${identityServiceEndpoint}/challenge`,
    {
      method: "POST",
      body: JSON.stringify({ challenge }),
      headers: {
        "Content-Type": "application/json"
      }
    }
  )

  const { signedChallenge } = v.parse(
    challengeResponseSchema,
    await challengeResponse.json()
  )

  const parsed = await verifyJwt(signedChallenge, {
    resolver,
    issuer: did,
    policies: {
      aud: false
    }
  })

  if (parsed.payload.sub !== challenge) {
    throw new Error("Challenge response does not match challenge")
  }

  // Fetch the agent's ownership credential
  const vcResponse = await fetch(`${identityServiceEndpoint}/vc`)

  const vc = credentialSchema.parse(await vcResponse.json())

  // Verify the ownership credential
  await verifier.verifyCredential(vc)

  return true
}

export function getIdentityTools({ resolver, verifier }: IdentityToolsParams) {
  return {
    validateIdentity: tool({
      description: "Validate counterparty identity",
      parameters: valibotSchema(
        v.object({
          did: v.string()
        })
      ),
      execute: async ({ did }) => {
        console.log(colors.dim(`> Validating identity for ${did}`))
        try {
          await verifyIdentity(did as DidUri, resolver, verifier)
        } catch (_error: unknown) {
          return {
            success: false,
            message: "Identity validation failed"
          }
        }
        return {
          success: true,
          message: "Identity validated"
        }
      }
    })
  }
}
