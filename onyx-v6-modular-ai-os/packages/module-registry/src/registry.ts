import type {
  ApplicationManifest,
  ModuleManifest,
} from "./manifest";

function normalizeAlias(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export class ModuleRegistry {
  private readonly modules =
    new Map<string, ModuleManifest>();

  private readonly moduleAliases =
    new Map<string, string>();

  private readonly applications =
    new Map<string, ApplicationManifest>();

  private readonly applicationAliases =
    new Map<string, string>();

  registerModule(
    manifest: ModuleManifest,
  ): void {
    if (this.modules.has(manifest.id)) {
      throw new Error(
        `Module already registered: ${manifest.id}`,
      );
    }

    this.modules.set(
      manifest.id,
      manifest,
    );

    this.registerAliases(
      manifest.id,
      [
        manifest.id,
        manifest.title,
        ...manifest.aliases,
      ],
      this.moduleAliases,
      "module",
    );
  }

  registerApplication(
    manifest: ApplicationManifest,
  ): void {
    if (this.applications.has(manifest.id)) {
      throw new Error(
        `Application already registered: ${manifest.id}`,
      );
    }

    this.applications.set(
      manifest.id,
      manifest,
    );

    this.registerAliases(
      manifest.id,
      [
        manifest.id,
        manifest.title,
        ...manifest.aliases,
      ],
      this.applicationAliases,
      "application",
    );
  }

  getModule(
    id: string,
  ): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  getApplication(
    id: string,
  ): ApplicationManifest | undefined {
    return this.applications.get(id);
  }

  resolveModule(
    value: string,
  ): ModuleManifest | undefined {
    const normalized =
      normalizeAlias(value);

    const moduleId =
      this.moduleAliases.get(normalized);

    return moduleId
      ? this.modules.get(moduleId)
      : undefined;
  }

  resolveApplication(
    value: string,
  ): ApplicationManifest | undefined {
    const normalized =
      normalizeAlias(value);

    const applicationId =
      this.applicationAliases.get(
        normalized,
      );

    return applicationId
      ? this.applications.get(
          applicationId,
        )
      : undefined;
  }

  listModules(): ModuleManifest[] {
    return Array.from(
      this.modules.values(),
    );
  }

  listApplications(): ApplicationManifest[] {
    return Array.from(
      this.applications.values(),
    );
  }

  private registerAliases(
    id: string,
    aliases: readonly string[],
    target: Map<string, string>,
    type: "module" | "application",
  ): void {
    for (const alias of aliases) {
      const normalized =
        normalizeAlias(alias);

      if (!normalized) {
        continue;
      }

      const existing =
        target.get(normalized);

      if (
        existing !== undefined &&
        existing !== id
      ) {
        throw new Error(
          `Duplicate ${type} alias "${normalized}" ` +
          `for "${existing}" and "${id}"`,
        );
      }

      target.set(
        normalized,
        id,
      );
    }
  }
}