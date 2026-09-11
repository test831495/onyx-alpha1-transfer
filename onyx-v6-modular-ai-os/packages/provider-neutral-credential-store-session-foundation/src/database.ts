import { getDatabase, type DatabaseConnection } from "@netlify/database";
import { parseCredentialKeyRing } from "./config.js";

export type DatabaseRuntimeContext = "production" | "deploy-preview" | "branch-deploy" | "local" | "test" | "unknown";

export type DatabaseRuntimePolicy = {
  readonly context: DatabaseRuntimeContext;
  readonly credentialOperationsEnabled: boolean;
  readonly providerCallsEnabled: boolean;
  readonly databaseAccessEnabled: boolean;
};

export function readDatabaseRuntimeContext(environment: Record<string, string | undefined>): DatabaseRuntimeContext {
  switch (environment.CONTEXT) {
    case "production": return "production";
    case "deploy-preview": return "deploy-preview";
    case "branch-deploy": return "branch-deploy";
    case "test": return "test";
    case "local": return "local";
    default: return environment.NODE_ENV === "test" ? "test" : "unknown";
  }
}

export function createDatabaseRuntimePolicy(context: DatabaseRuntimeContext, hasProductionKey: boolean, hasExplicitConnectionOverride = false, credentialActivationEnabled = false): DatabaseRuntimePolicy {
  if (context === "unknown") throw new Error("Unknown database runtime context");
  if (context === "production" && !hasProductionKey) throw new Error("Production credential key is required");
  if (context !== "production" && hasProductionKey) throw new Error("Production credential key is forbidden outside production");
  if (hasExplicitConnectionOverride && context !== "test") throw new Error("Explicit database connection is test-only");
  return {
    context,
    credentialOperationsEnabled: context === "production" && credentialActivationEnabled,
    providerCallsEnabled: false,
    databaseAccessEnabled: context === "production" || context === "test",
  };
}

export type DatabaseRuntimeOptions = {
  readonly context: DatabaseRuntimeContext;
  readonly hasProductionKey: boolean;
  readonly connectionString?: string;
  readonly testOnly?: boolean;
  readonly credentialActivationEnabled?: boolean;
};

export function getNetlifyDatabase(): DatabaseConnection {
  return getDatabase();
}

export function createNetlifyDatabase(options: DatabaseRuntimeOptions): DatabaseConnection {
  const policy = createDatabaseRuntimePolicy(options.context, options.hasProductionKey, options.connectionString !== undefined, options.credentialActivationEnabled);
  if (!policy.databaseAccessEnabled) throw new Error("Database access is disabled for this runtime");
  if (options.connectionString !== undefined && (!options.testOnly || options.context !== "test")) throw new Error("Explicit database connection is test-only");
  return options.connectionString === undefined ? getDatabase() : getDatabase({ connectionString: options.connectionString });
}

export function createConfiguredNetlifyDatabase(environment: Record<string, string | undefined> = process.env, options: Omit<DatabaseRuntimeOptions, "context" | "hasProductionKey"> = {}): DatabaseConnection {
  const context = readDatabaseRuntimeContext(environment);
  const keyRing = parseCredentialKeyRing(environment, context);
  return createNetlifyDatabase({ ...options, context, hasProductionKey: keyRing.active !== undefined });
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