import type {
  AuthenticatedRequestContext,
  AuthenticationProvider,
} from "@onyx/account-authentication-server-authority";
import { cryptoRequestIdGenerator } from "@onyx/account-authentication-server-authority";
import type {
  OnyxSessionAuthority,
  ServerSessionContext,
} from "@onyx/provider-neutral-credential-store-session-foundation";

export type OnyxSessionContext = ServerSessionContext & {
  readonly actorId: string;
  readonly authorizationState: "AUTHORIZED" | "DENIED";
  readonly capabilityState: readonly string[];
  readonly auditContext: Readonly<Record<string, string>>;
};

export type OnyxAuthorityRuntimeContext =
  | "production"
  | "deploy-preview"
  | "branch-deploy"
  | "local"
  | "test"
  | "unknown";

export type OnyxSessionAuthorityFactory = {
  readonly authority: OnyxSessionAuthority;
  readonly verifyContext: (proof: string | undefined) => Promise<OnyxSessionContext | undefined>;
};

export function createOnyxSessionAuthorityFactory(input: {
  readonly authenticationProvider: AuthenticationProvider;
  readonly mapContext: (context: AuthenticatedRequestContext) => OnyxSessionContext;
  readonly runtimeContext: OnyxAuthorityRuntimeContext;
  readonly now?: () => number;
}): OnyxSessionAuthorityFactory {
  const now = input.now ?? Date.now;
  const active = input.runtimeContext === "production";

  const verifyContext = async (proof: string | undefined): Promise<OnyxSessionContext | undefined> => {
    if (!active || !proof) return undefined;
    const decision = input.authenticationProvider.verifyProof(proof, Math.floor(now() / 1000));
    if (!decision.allowed || !decision.proof) return undefined;
    try {
      const canonicalContext = input.authenticationProvider.deriveAuthenticatedContext(
        decision.proof,
        nextRequestId(),
      );
      const issuedAt = new Date(canonicalContext.issuedAt).getTime();
      const expiresAt = new Date(canonicalContext.expiresAt).getTime();
      if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= now() || issuedAt > expiresAt) return undefined;
      const context = input.mapContext(canonicalContext);
      if (context.authorizationState !== "AUTHORIZED") return undefined;
      if (!context.sessionRef || !context.canonicalAccountRef || !context.actorId) return undefined;
      return context;
    } catch {
      return undefined;
    }
  };

  return {
    verifyContext,
    authority: {
      issue: async () => {
        throw new Error("ONYX session issuance is owned by the canonical session issuer.");
      },
      verify: async (proof) => {
        const context = await verifyContext(proof);
        if (!context) return undefined;
        const {
          actorId: _actorId,
          authorizationState: _authorizationState,
          capabilityState: _capabilityState,
          auditContext: _auditContext,
          ...serverContext
        } = context;
        return serverContext;
      },
    },
  };
}

function nextRequestId(): `request_${string}` {
  const requestId = cryptoRequestIdGenerator.next();
  if (!requestId) throw new Error("Authority request id unavailable.");
  return requestId as `request_${string}`;
}