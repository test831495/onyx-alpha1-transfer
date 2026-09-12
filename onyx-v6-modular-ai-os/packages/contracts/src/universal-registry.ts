export const UNIVERSAL_REGISTRY_SCHEMA_VERSION = 1 as const;

export const REGISTRY_ID_PREFIXES = [
  "onyx.app.",
  "onyx.surface.",
  "onyx.nav.",
  "onyx.conversation-target.",
  "onyx.setting.",
  "onyx.voice-provider.",
  "onyx.wake-word.",
] as const;

export type RegistryIdPrefix = (typeof REGISTRY_ID_PREFIXES)[number];
export type RegistryId = `${RegistryIdPrefix}${string}`;

export const REGISTRY_OWNERS = ["TRACK_B"] as const;
export type RegistryOwner = (typeof REGISTRY_OWNERS)[number];

export const REGISTRY_AVAILABILITY = ["UNKNOWN", "AVAILABLE", "UNAVAILABLE"] as const;
export type RegistryAvailability = (typeof REGISTRY_AVAILABILITY)[number];

export const REGISTRY_FEATURE_STATES = ["DORMANT", "SHADOW", "ACTIVE"] as const;
export type RegistryFeatureState = (typeof REGISTRY_FEATURE_STATES)[number];

export type RegistryPrivacyClass = "PUBLIC" | "LOCAL_PRIVATE" | "SENSITIVE";
export type RegistryAccessibilityClass = "STANDARD" | "LARGE_TEXT" | "HIGH_CONTRAST";

export type RegistryRecordKind =
  | "APPLICATION"
  | "SURFACE"
  | "NAVIGATION"
  | "CONVERSATION_TARGET"
  | "SETTING"
  | "VOICE"
  | "WAKE_WORD"
  | "ACCESSIBILITY"
  | "PRIVACY"
  | "TRUTH_SOURCE";

export type TruthSourceClass =
  | "DETERMINISTIC_LOCAL"
  | "VISIBLE_PORTAL_STATE"
  | "LOCAL_APPLICATION"
  | "LOCAL_FILE"
  | "SESSION_CONTEXT"
  | "GOVERNED_MEMORY"
  | "CONNECTOR_GROUNDED"
  | "GOVERNANCE_PROJECTION"
  | "USER_SUPPLIED"
  | "GENERAL_MODEL_KNOWLEDGE"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type RegistryMetadata = Readonly<{
  id: RegistryId;
  schema: string;
  schemaVersion: number;
  displayKey: string;
  aliases: readonly string[];
  owner: RegistryOwner;
  provenance: string;
  availability: RegistryAvailability;
  featureState: RegistryFeatureState;
  privacyClass: RegistryPrivacyClass;
  accessibilityClass: RegistryAccessibilityClass;
  recordKind: RegistryRecordKind;
  deprecated?: boolean;
  supersedes?: RegistryId;
}>;

export type ApplicationMetadata = RegistryMetadata & Readonly<{
  recordKind: "APPLICATION";
  iconKey?: string;
  launcherOrder?: number;
  visible?: boolean;
  supportsMinimize?: boolean;
  supportsClose?: boolean;
}>;

export type SurfaceMetadata = RegistryMetadata & Readonly<{
  recordKind: "SURFACE";
  applicationId: RegistryId;
  surfaceKind: "CARD" | "DETAIL" | "TAB" | "PANEL";
  visible?: boolean;
}>;

export type NavigationMetadata = RegistryMetadata & Readonly<{
  recordKind: "NAVIGATION";
  targetId: RegistryId;
  navigationKind: "OPEN" | "CLOSE" | "FOCUS" | "RESTORE";
  executable: false;
}>;

export type ConversationTargetMetadata = RegistryMetadata & Readonly<{
  recordKind: "CONVERSATION_TARGET";
  targetId: RegistryId;
  commandAliases: readonly string[];
}>;

export type SettingsMetadata = RegistryMetadata & Readonly<{
  recordKind: "SETTING";
  valueKind: "BOOLEAN" | "NUMBER" | "STRING" | "ENUM";
  defaultValue?: boolean | number | string;
  minimum?: number;
  maximum?: number;
  step?: number;
  persistenceKey?: string;
}>;

export type VoiceMetadata = RegistryMetadata & Readonly<{
  recordKind: "VOICE";
  providerId: RegistryId;
  locales: readonly string[];
  characterIndependent: true;
}>;

export type WakeWordMetadata = RegistryMetadata & Readonly<{
  recordKind: "WAKE_WORD";
  phrase: string;
  candidate: boolean;
  activatesListener: false;
}>;

export type AccessibilityMetadata = RegistryMetadata & Readonly<{
  recordKind: "ACCESSIBILITY";
  settingId: RegistryId;
}>;

export type PrivacyMetadata = RegistryMetadata & Readonly<{
  recordKind: "PRIVACY";
  classification: RegistryPrivacyClass;
}>;

export type TruthSourceMetadata = RegistryMetadata & Readonly<{
  recordKind: "TRUTH_SOURCE";
  truthClass: TruthSourceClass;
  freshness: "STATIC" | "SESSION" | "LIVE" | "UNKNOWN";
}>;

export type UniversalRegistryRecord =
  | ApplicationMetadata
  | SurfaceMetadata
  | NavigationMetadata
  | ConversationTargetMetadata
  | SettingsMetadata
  | VoiceMetadata
  | WakeWordMetadata
  | AccessibilityMetadata
  | PrivacyMetadata
  | TruthSourceMetadata;

export type UniversalRegistry = readonly UniversalRegistryRecord[];

export type RegistrySourceRecord = Readonly<{
  id: string;
  label?: string;
  displayKey?: string;
  aliases?: readonly string[];
  icon?: string;
  visible?: boolean;
  launcherOrder?: number;
  navigationTarget?: string;
  provenance: string;
}>;

export function createApplicationMetadata(
  input: Omit<ApplicationMetadata, "recordKind">,
): ApplicationMetadata {
  return { ...input, recordKind: "APPLICATION" };
}

export function projectApplicationSource(
  source: RegistrySourceRecord,
  overrides: Omit<ApplicationMetadata, "id" | "displayKey" | "aliases" | "recordKind" | "iconKey" | "visible" | "launcherOrder"> &
    Partial<Pick<ApplicationMetadata, "iconKey" | "visible" | "launcherOrder">>,
): ApplicationMetadata {
  return createApplicationMetadata({
    ...overrides,
    id: `onyx.app.${source.id}` as RegistryId,
    displayKey: source.displayKey ?? source.label ?? source.id,
    aliases: Object.freeze([...(source.aliases ?? [])]),
    ...(source.icon === undefined ? {} : { iconKey: source.icon }),
    ...(source.visible === undefined ? {} : { visible: source.visible }),
    ...(source.launcherOrder === undefined ? {} : { launcherOrder: source.launcherOrder }),
  });
}