import type {
  ModuleId,
} from "@onyx/contracts";

export type ModuleAvailability =
  | "available"
  | "placeholder"
  | "disabled";

export interface ModuleManifest {
  id: ModuleId;
  title: string;
  description: string;
  aliases: readonly string[];
  capabilities: readonly string[];
  availability: ModuleAvailability;
}

export interface ApplicationManifest {
  id: string;
  title: string;
  description: string;
  aliases: readonly string[];
  capabilities: readonly string[];
  availability: ModuleAvailability;
  launchMode:
    | "embedded"
    | "external"
    | "native"
    | "unavailable";
}