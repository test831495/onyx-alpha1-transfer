export type B1ProviderLane = Readonly<{
  adapterId: string;
  providerFamily: string;
  declaredOperations: readonly string[];
  applicationIds: readonly string[];
  searchModes: readonly string[];
  dataClasses: readonly string[];
  forbiddenOperations: readonly string[];
  syntheticOnly: true;
  enabledByDefault: false;
}>;

export const B1_PROVIDER_MATRIX: readonly B1ProviderLane[] = Object.freeze([
  Object.freeze({ adapterId: "train-b.github.read-only", providerFamily: "github", declaredOperations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"], applicationIds: ["application.files"], searchModes: ["METADATA", "FULL_TEXT"], dataClasses: ["ENGINEERING_METADATA", "ENGINEERING_ACTIVITY", "ENGINEERING_OBSERVABILITY"], forbiddenOperations: ["MERGE", "CREATE", "UPDATE", "DELETE", "SEND", "DEPLOY", "EXECUTE_WORKFLOW"], syntheticOnly: true, enabledByDefault: false }),
  Object.freeze({ adapterId: "train-b.netlify.read-only", providerFamily: "netlify", declaredOperations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"], applicationIds: ["application.files"], searchModes: ["METADATA", "FULL_TEXT"], dataClasses: ["DEPLOYMENT_METADATA", "DEPLOYMENT_OBSERVABILITY"], forbiddenOperations: ["DEPLOY", "RESTORE", "MODIFY_CONFIGURATION", "ROTATE_SECRET", "DELETE"], syntheticOnly: true, enabledByDefault: false }),
  Object.freeze({ adapterId: "train-b.microsoft.read-only", providerFamily: "microsoft", declaredOperations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"], applicationIds: ["application.mail", "application.calendar", "application.files"], searchModes: ["METADATA", "FULL_TEXT"], dataClasses: ["MAIL_METADATA", "CALENDAR_METADATA", "FILE_METADATA"], forbiddenOperations: ["SEND", "DELETE", "CREATE", "UPDATE", "SHARE", "CHANGE_PERMISSION"], syntheticOnly: true, enabledByDefault: false }),
  Object.freeze({ adapterId: "train-b.google.read-only", providerFamily: "google", declaredOperations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"], applicationIds: ["application.mail", "application.calendar", "application.files"], searchModes: ["METADATA", "FULL_TEXT"], dataClasses: ["MAIL_METADATA", "CALENDAR_METADATA", "FILE_METADATA"], forbiddenOperations: ["SEND", "DELETE", "CREATE", "UPDATE", "SHARE", "CHANGE_PERMISSION"], syntheticOnly: true, enabledByDefault: false }),
]);
