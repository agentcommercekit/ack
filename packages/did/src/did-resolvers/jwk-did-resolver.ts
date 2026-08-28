import type { DIDDocument, DIDResolutionResult } from '../types.js';

export async function resolveJwkDid(did: string): Promise<DIDResolutionResult> {
  const parts = did.split(':');
  if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'jwk') {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'invalidDid' },
    };
  }

  try {
    const encodedJwk = parts[2];
    const jsonString = Buffer.from(encodedJwk, 'base64url').toString('utf8');
    const jwk = JSON.parse(jsonString);

    const didDocument: DIDDocument = {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
      id: did,
      verificationMethod: [
        {
          id: `${did}#0`,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyJwk: jwk,
        },
      ],
      assertionMethod: [`${did}#0`],
      authentication: [`${did}#0`],
      capabilityInvocation: [`${did}#0`],
      capabilityDelegation: [`${did}#0`],
    };

    return {
      didDocument,
      didDocumentMetadata: {},
      didResolutionMetadata: { contentType: 'application/did+ld+json' },
    };
  } catch {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'notFound' },
    };
  }
}