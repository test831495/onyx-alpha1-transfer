import type { CredentialEncryptionKey } from "./crypto.js";
import type { CredentialBinding, CredentialRecord } from "./store.js";

export interface CredentialStoreLike {
  read(recordId: string, binding: CredentialBinding, key: CredentialEncryptionKey): string | Promise<string>;
  replace(recordId: string, binding: CredentialBinding, expectedVersion: number, plaintext: string, key: CredentialEncryptionKey): CredentialRecord | Promise<CredentialRecord>;
  findActive?(binding: CredentialBinding): CredentialRecord | undefined | Promise<CredentialRecord | undefined>;
}

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
  constructor(private readonly store: CredentialStoreLike, private readonly key: CredentialEncryptionKey) {}

  async withAccessToken<T>(context: TokenBrokerContext, refresh: ProviderRefreshAdapter, use: (accessToken: string) => Promise<TokenUseResult<T>>): Promise<TokenUseResult<T>> {
    const refreshToken = await this.store.read(context.recordId, context, this.key);
    const result = await refresh(refreshToken, context);
    if (result.refreshToken !== undefined) {
      await this.store.replace(context.recordId, context, context.expectedVersion, result.refreshToken, this.key);
    }
    const used = await use(result.accessToken);
    return { value: used.value, expiresInSeconds: Math.min(used.expiresInSeconds, result.expiresInSeconds) };
  }
}