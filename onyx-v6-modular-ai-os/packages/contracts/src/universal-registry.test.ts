import { describe, expect, it } from "vitest";
import {
  compareApplicationParity,
  B4_1_ACCEPTANCE_REGISTRY,
  orderUniversalRegistry,
  projectApplicationSource,
  serializeUniversalRegistry,
  validateUniversalRegistry,
  type ApplicationMetadata,
} from "./index";

const base = (id: ApplicationMetadata["id"]): ApplicationMetadata => ({
  id,
  schema: "onyx.application",
  schemaVersion: 1,
  displayKey: id,
  aliases: [],
  owner: "TRACK_B",
  provenance: "test",
  availability: "UNKNOWN",
  featureState: "DORMANT",
  privacyClass: "PUBLIC",
  accessibilityClass: "STANDARD",
  recordKind: "APPLICATION",
});

describe("universal registry foundation", () => {
  it("validates namespaced IDs and rejects duplicates", () => {
    expect(() => validateUniversalRegistry([base("onyx.app.mail"), base("onyx.app.mail")])).toThrow(/validation failed/i);
    expect(() => validateUniversalRegistry([{ ...base("bad" as ApplicationMetadata["id"]) }])).toThrow(/validation failed/i);
  });

  it("orders and serializes deterministically", () => {
    const records = orderUniversalRegistry([base("onyx.app.tasks"), base("onyx.app.mail")]);
    expect(records.map((record) => record.id)).toEqual(["onyx.app.mail", "onyx.app.tasks"]);
    expect(serializeUniversalRegistry(records)).toBe(serializeUniversalRegistry([...records].reverse()));
  });

  it("returns immutable records and nested arrays", () => {
    const [record] = validateUniversalRegistry([{ ...base("onyx.app.mail"), aliases: ["outlook"] }]);
    expect(record).toBeDefined();
    expect(Object.isFrozen(record!)).toBe(true);
    expect(Object.isFrozen(record!.aliases)).toBe(true);
  });

  it("keeps source projection metadata-only", () => {
    const record = projectApplicationSource(
      { id: "mail", label: "Mail", aliases: ["outlook"], icon: "mail", launcherOrder: 5, provenance: "applicationRegistry" },
      { schema: "onyx.application", schemaVersion: 1, owner: "TRACK_B", provenance: "applicationRegistry", availability: "UNKNOWN", featureState: "DORMANT", privacyClass: "PUBLIC", accessibilityClass: "STANDARD", supportsMinimize: true, supportsClose: true },
    );
    expect(record.id).toBe("onyx.app.mail");
    expect(record.recordKind).toBe("APPLICATION");
  });

  it("reports application parity drift fail closed", () => {
    const report = compareApplicationParity([base("onyx.app.mail")], [{ id: "mail", label: "Outlook Mail", provenance: "applicationRegistry" }]);
    expect(report.passed).toBe(false);
    expect(report.issues[0]?.code).toBe("LABEL_MISMATCH");
    expect(report.issues[0]?.drift).toBe("BLOCKING_DRIFT");
  });

  it("exposes every approved B4.1 acceptance family", () => {
    expect(B4_1_ACCEPTANCE_REGISTRY).toHaveLength(18);
    expect(new Set(B4_1_ACCEPTANCE_REGISTRY.map((entry) => entry.family)).size).toBe(18);
  });
});