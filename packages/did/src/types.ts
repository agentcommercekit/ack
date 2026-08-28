export type DIDDocument = {
  '@context'?: string | string[];
  id: string;
  alsoKnownAs?: string[];
  controller?: string | string[];
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyJwk?: Record<string, unknown>;
    publicKeyMultibase?: string;
  }>;
  authentication?: Array<string | Record<string, unknown>>;
  assertionMethod?: Array<string | Record<string, unknown>>;
  keyAgreement?: Array<string | Record<string, unknown>>;
  capabilityInvocation?: Array<string | Record<string, unknown>>;
  capabilityDelegation?: Array<string | Record<string, unknown>>;
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string | Record<string, unknown> | Array<unknown>;
  }>;
};

export type DIDResolutionResult = {
  didDocument: DIDDocument | null;
  didDocumentMetadata: Record<string, unknown>;
  didResolutionMetadata: Record<string, unknown>;
};

export type DidUriWithDocument = {
  did: string;
  document: DIDDocument;
};

export type FetchLike = typeof fetch;