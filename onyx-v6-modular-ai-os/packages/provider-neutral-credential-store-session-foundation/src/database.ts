import { getDatabase, type DatabaseConnection } from "@netlify/database";

export type DatabaseRuntimeContext = "production" | "deploy-preview" | "branch-deploy" | "local";

export type DatabaseRuntimePolicy = {
  readonly context: DatabaseRuntimeContext;
  readonly credentialOperationsEnabled: boolean;
  readonly providerCallsEnabled: boolean;
};

export function createDatabaseRuntimePolicy(context: DatabaseRuntimeContext, hasProductionKey: boolean): DatabaseRuntimePolicy {
  if (context === "production" && !hasProductionKey) throw new Error("Production credential key is required");
  if (context !== "production" && hasProductionKey) throw new Error("Production credential key is forbidden outside production");
  return { context, credentialOperationsEnabled: context === "production", providerCallsEnabled: false };
}

export function getNetlifyDatabase(connectionString?: string): DatabaseConnection {
  return getDatabase(connectionString === undefined ? undefined : { connectionString });
}

export async function withDatabaseTransaction<T>(database: DatabaseConnection, operation: (query: (text: string, values?: readonly unknown[]) => Promise<unknown>) => Promise<T>): Promise<T> {
  const client = await database.pool.connect();
  const query = (text: string, values?: readonly unknown[]) => client.query(text, values as unknown[] | undefined);
  try {
    await query("BEGIN");
    const result = await operation(query);
    await query("COMMIT");
    return result;
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}