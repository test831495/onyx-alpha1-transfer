import { CredentialEncryptionKey } from "./crypto.js";
import { CredentialBinding, InMemoryCredentialStore } from "./store.js";

export type TokenBrokerContext = CredentialBinding & {
  readonly recordId: string;
  readonly expectedVersion: number;
};

export type RefreshResult = {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresInSeconds: number;
};

export type ProviderRefreshAdapter = (refreshToken: string, context: TokenBrokerContext) => Promise<RefreshResult>;

export type TokenUseResult<T> = { readonly value: T; readonly expiresInSeconds: number };

export class TokenBroker {
  constructor(private readonly store: InMemoryCredentialStore, private readonly key: CredentialEncryptionKey) {}

  async withAccessToken<T>(context: TokenBrokerContext, refresh: ProviderRefreshAdapter, use: (accessToken: string) => Promise<TokenUseResult<T>>): Promise<TokenUseResult<T>> {
    const refreshToken = this.store.read(context.recordId, context, this.key);
    const result = await refresh(refreshToken, context);
    if (result.refreshToken !== undefined) {
      this.store.replace(context.recordId, context, context.expectedVersion, result.refreshToken, this.key);
    }
    const used = await use(result.accessToken);
    return { value: used.value, expiresInSeconds: Math.min(used.expiresInSeconds, result.expiresInSeconds) };
  }
}