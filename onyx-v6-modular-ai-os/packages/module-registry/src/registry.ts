import type { ApplicationManifest, ModuleManifest } from "./manifest";
const normalizeAlias = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleManifest>();
  private readonly moduleAliases = new Map<string, string>();
  private readonly applications = new Map<string, ApplicationManifest>();
  private readonly applicationAliases = new Map<string, string>();
  registerModule(manifest: ModuleManifest): void { if (this.modules.has(manifest.id)) throw new Error(`Module already registered: ${manifest.id}`); this.modules.set(manifest.id, manifest); this.registerAliases(manifest.id, [manifest.id, manifest.title, ...manifest.aliases], this.moduleAliases, "module"); }
  registerApplication(manifest: ApplicationManifest): void { if (this.applications.has(manifest.id)) throw new Error(`Application already registered: ${manifest.id}`); this.applications.set(manifest.id, manifest); this.registerAliases(manifest.id, [manifest.id, manifest.title, ...manifest.aliases], this.applicationAliases, "application"); }
  getModule(id: string) { return this.modules.get(id); }
  getApplication(id: string) { return this.applications.get(id); }
  resolveModule(value: string) { const id = this.moduleAliases.get(normalizeAlias(value)); return id ? this.modules.get(id) : undefined; }
  resolveApplication(value: string) { const id = this.applicationAliases.get(normalizeAlias(value)); return id ? this.applications.get(id) : undefined; }
  listModules() { return [...this.modules.values()]; }
  listApplications() { return [...this.applications.values()]; }
  private registerAliases(id: string, aliases: readonly string[], target: Map<string,string>, type: string): void { for (const alias of aliases) { const key=normalizeAlias(alias); if (!key) continue; const existing=target.get(key); if (existing && existing!==id) throw new Error(`Duplicate ${type} alias "${key}" for "${existing}" and "${id}"`); target.set(key,id); } }
}
