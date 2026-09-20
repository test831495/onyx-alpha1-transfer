import { getDatabase, MissingDatabaseConnectionError, type DatabaseConnection } from "@netlify/database";
import { parseCredentialKeyRing } from "./config.js";

export type DatabaseRuntimeContext = "production" | "deploy-preview" | "branch-deploy" | "local" | "test" | "unknown";

export type DatabaseRuntimePolicy = {
  readonly context: DatabaseRuntimeContext;
  readonly credentialOperationsEnabled: boolean;
  readonly providerCallsEnabled: boolean;
  readonly databaseAccessEnabled: boolean;
};

export function readDatabaseRuntimeContext(environment: Record<string, string | undefined>): DatabaseRuntimeContext {
  // Netlify's system `CONTEXT` variable is build-scope only and is not guaranteed to reach
  // the Functions runtime, so an explicit user-configured override takes precedence when present.
  switch (environment.ONYX_RUNTIME_CONTEXT ?? environment.CONTEXT) {
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
  readonly productionConnectionString?: string;
  readonly testOnly?: boolean;
  readonly credentialActivationEnabled?: boolean;
  readonly databaseFactory?: NetlifyDatabaseFactory;
};

export type NetlifyDatabaseFactory = (options?: { readonly connectionString: string }) => DatabaseConnection;

const isMissingDatabaseConnectionError = (error: unknown): boolean =>
  error instanceof MissingDatabaseConnectionError ||
  (typeof error === "object" && error !== null && "name" in error && error.name === "MissingDatabaseConnectionError");

function createApprovedNetlifyDatabase(options: DatabaseRuntimeOptions): DatabaseConnection {
  const policy = createDatabaseRuntimePolicy(options.context, options.hasProductionKey, options.connectionString !== undefined, options.credentialActivationEnabled);
  if (!policy.databaseAccessEnabled) throw new Error("Database access is disabled for this runtime");
  if (options.connectionString !== undefined && (!options.testOnly || options.context !== "test")) throw new Error("Explicit database connection is test-only");
  const databaseFactory = options.databaseFactory ?? getDatabase;
  if (options.connectionString !== undefined) return databaseFactory({ connectionString: options.connectionString });
  try {
    return databaseFactory();
  } catch (error) {
    const productionConnectionString = options.productionConnectionString;
    if (options.context !== "production" || !isMissingDatabaseConnectionError(error) || !productionConnectionString?.trim()) {
      throw error;
    }
    return databaseFactory({ connectionString: productionConnectionString });
  }
}

export function createTestNetlifyDatabase(connectionString: string): DatabaseConnection {
  return createApprovedNetlifyDatabase({ context: "test", hasProductionKey: false, connectionString, testOnly: true });
}

export type DatabaseConfigurationClassification =
  | "DATABASE_CONFIGURATION_AVAILABLE"
  | "DATABASE_CONFIGURATION_UNAVAILABLE"
  | "DATABASE_CONNECTION_INITIALIZATION_FAILED";

// Bounded, non-throwing classification. Never logs a connection string, hostname, credential, or pool
// configuration; distinguishes a policy-level gap from an actual connection construction failure.
export function classifyDatabaseConfiguration(
  environment: Record<string, string | undefined>,
  attemptConnection?: () => DatabaseConnection,
): DatabaseConfigurationClassification {
  let policy: DatabaseRuntimePolicy;
  try {
    const context = readDatabaseRuntimeContext(environment);
    const keyRing = parseCredentialKeyRing(environment, context);
    policy = createDatabaseRuntimePolicy(context, keyRing.active !== undefined);
  } catch {
    return "DATABASE_CONFIGURATION_UNAVAILABLE";
  }
  if (!policy.databaseAccessEnabled) return "DATABASE_CONFIGURATION_UNAVAILABLE";
  if (!attemptConnection) return "DATABASE_CONFIGURATION_AVAILABLE";
  try {
    attemptConnection();
    return "DATABASE_CONFIGURATION_AVAILABLE";
  } catch {
    return "DATABASE_CONNECTION_INITIALIZATION_FAILED";
  }
}

export function createConfiguredNetlifyDatabase(environment: Record<string, string | undefined> = process.env, options: Omit<DatabaseRuntimeOptions, "context" | "hasProductionKey" | "productionConnectionString"> = {}): DatabaseConnection {
  const context = readDatabaseRuntimeContext(environment);
  const keyRing = parseCredentialKeyRing(environment, context);
  return createApprovedNetlifyDatabase({
    ...options,
    context,
    hasProductionKey: keyRing.active !== undefined,
    productionConnectionString: context === "production" ? environment.ONYX_DATABASE_CONNECTION_STRING : undefined,
  });
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