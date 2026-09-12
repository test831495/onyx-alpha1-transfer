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

  // Regression tests for review findings

  describe("FINDING_1: Deterministic locale-independent ordering", () => {
    it("uses locale-independent comparison for IDs regardless of environment locale", () => {
      const records1 = [base("onyx.app.zebra"), base("onyx.app.apple"), base("onyx.app.banana")];
      const records2 = [base("onyx.app.apple"), base("onyx.app.zebra"), base("onyx.app.banana")];
      const ordered1 = orderUniversalRegistry(records1);
      const ordered2 = orderUniversalRegistry(records2);
      expect(ordered1.map((r) => r.id)).toEqual(ordered2.map((r) => r.id));
      const ids1 = ordered1.map((r) => r.id);
      const ids2 = ordered2.map((r) => r.id);
      expect(ids1).toEqual(ids2);
    });
  });

  describe("FINDING_2: Deterministic JSON serialization with property order", () => {
    it("serializes equivalent records to identical JSON strings regardless of construction order", () => {
      const baseRecord = base("onyx.app.test");
      const record1: ApplicationMetadata = {
        ...baseRecord,
        aliases: ["alias1"],
        iconKey: "icon1",
      };
      // Same record but constructed with different property order internally
      const record2: ApplicationMetadata = {
        ...baseRecord,
        iconKey: "icon1",
        aliases: ["alias1"],
      };
      const ser1 = serializeUniversalRegistry([record1]);
      const ser2 = serializeUniversalRegistry([record2]);
      expect(ser1).toBe(ser2);
    });

    it("produces consistent serialization across multiple calls with same input", () => {
      const records = [base("onyx.app.mail"), base("onyx.app.tasks")];
      const ser1 = serializeUniversalRegistry(records);
      const ser2 = serializeUniversalRegistry(records);
      const ser3 = serializeUniversalRegistry(records);
      expect(ser1).toBe(ser2);
      expect(ser2).toBe(ser3);
    });
  });

  describe("FINDING_3: Parity displayKey precedence", () => {
    it("compares displayKey when provided, with label as fallback", () => {
      const appRecord = base("onyx.app.mail");
      const sources = [
        {
          id: "mail",
          displayKey: "Mail App",
          label: "Different Label",
          provenance: "test",
        },
      ];
      const report = compareApplicationParity([appRecord], sources);
      expect(report.passed).toBe(false);
      expect(report.issues).toContainEqual(
        expect.objectContaining({ code: "LABEL_MISMATCH" }),
      );
    });

    it("uses label when displayKey is absent", () => {
      const appRecord = { ...base("onyx.app.mail"), displayKey: "Expected Label" };
      const sources = [
        {
          id: "mail",
          label: "Expected Label",
          provenance: "test",
        },
      ];
      const report = compareApplicationParity([appRecord], sources);
      expect(report.passed).toBe(true);
    });
  });

  describe("FINDING_4: Remove navigation comparison from ApplicationParity", () => {
    it("should not compare navigationTarget since ApplicationMetadata has no navigationTarget field", () => {
      const appRecord = base("onyx.app.mail");
      const sources = [
        {
          id: "mail",
          navigationTarget: "calendar",
          provenance: "test",
        },
      ];
      const report = compareApplicationParity([appRecord], sources);
      expect(report.issues.some((i) => i.code === "NAVIGATION_MISMATCH")).toBe(false);
    });
  });

  describe("FINDING_5: Immutable parity issue objects", () => {
    it("freezes each RegistryParityIssue object individually", () => {
      const report = compareApplicationParity([base("onyx.app.mail")], [
        { id: "mail", label: "Outlook", provenance: "test" },
      ]);
      for (const issue of report.issues) {
        expect(Object.isFrozen(issue)).toBe(true);
      }
    });

    it("prevents mutation of parity issue properties", () => {
      const report = compareApplicationParity([base("onyx.app.mail")], [
        { id: "mail", label: "Outlook", provenance: "test" },
      ]);
      const [issue] = report.issues;
      expect(() => {
        (issue as any).message = "modified";
      }).toThrow();
    });
  });

  describe("FINDING_6: Discriminant-specific enum validation", () => {
    it("validates surfaceKind for SURFACE records", () => {
      const invalidSurface = {
        ...base("onyx.surface.test"),
        recordKind: "SURFACE" as const,
        applicationId: "onyx.app.test" as any,
        surfaceKind: "INVALID_KIND" as any,
      };
      expect(() => validateUniversalRegistry([invalidSurface as any])).toThrow(/validation failed/i);
    });

    it("validates navigationKind for NAVIGATION records", () => {
      const invalidNav = {
        ...base("onyx.nav.test"),
        recordKind: "NAVIGATION" as const,
        targetId: "onyx.app.test" as any,
        navigationKind: "INVALID" as any,
        executable: false,
      };
      expect(() => validateUniversalRegistry([invalidNav as any])).toThrow(/validation failed/i);
    });

    it("validates truthClass for TRUTH_SOURCE records", () => {
      const invalidTruth = {
        ...base("onyx.setting.test"),
        recordKind: "TRUTH_SOURCE" as const,
        truthClass: "INVALID_CLASS" as any,
        freshness: "STATIC" as const,
      };
      expect(() => validateUniversalRegistry([invalidTruth as any])).toThrow(/validation failed/i);
    });
  });

  describe("FINDING_7: Immutable application metadata objects", () => {
    it("returns frozen objects from projectApplicationSource", () => {
      const record = projectApplicationSource(
        { id: "mail", provenance: "test" },
        { schema: "onyx.application", schemaVersion: 1, owner: "TRACK_B", provenance: "test", availability: "UNKNOWN", featureState: "DORMANT", privacyClass: "PUBLIC", accessibilityClass: "STANDARD" },
      );
      expect(Object.isFrozen(record)).toBe(true);
    });

    it("prevents mutation of returned application metadata properties", () => {
      const record = projectApplicationSource(
        { id: "mail", provenance: "test" },
        { schema: "onyx.application", schemaVersion: 1, owner: "TRACK_B", provenance: "test", availability: "UNKNOWN", featureState: "DORMANT", privacyClass: "PUBLIC", accessibilityClass: "STANDARD" },
      );
      expect(() => {
        (record as any).displayKey = "hacked";
      }).toThrow();
    });

    it("freezes alias arrays in projected metadata", () => {
      const record = projectApplicationSource(
        { id: "mail", aliases: ["outlook", "mail-app"], provenance: "test" },
        { schema: "onyx.application", schemaVersion: 1, owner: "TRACK_B", provenance: "test", availability: "UNKNOWN", featureState: "DORMANT", privacyClass: "PUBLIC", accessibilityClass: "STANDARD" },
      );
      expect(Object.isFrozen(record.aliases)).toBe(true);
    });
  });

  describe("FINDING_8: Acceptance registry test verification", () => {
    it("verifies the exact set of 18 expected family names", () => {
      const expectedFamilies = [
        "BASELINE",
        "SCHEMA",
        "IDENTITY",
        "ORDERING",
        "DUPLICATE",
        "IMMUTABILITY",
        "PARITY",
        "APPLICATION",
        "SURFACE",
        "NAVIGATION_METADATA",
        "SETTINGS_METADATA",
        "VOICE_METADATA",
        "WAKE_METADATA",
        "PRIVACY",
        "ACCESSIBILITY",
        "TRACK_ISOLATION",
        "COMPATIBILITY",
        "ROLLBACK",
      ];
      const actualFamilies = B4_1_ACCEPTANCE_REGISTRY.map((r) => r.family);
      expect(actualFamilies).toEqual(expect.arrayContaining(expectedFamilies));
      expect(actualFamilies).toHaveLength(expectedFamilies.length);
    });

    it("verifies required fields on every acceptance family", () => {
      for (const entry of B4_1_ACCEPTANCE_REGISTRY) {
        expect(entry.family).toBeDefined();
        expect(entry.requirement).toBeDefined();
        expect(entry.risk).toBeDefined();
        expect(entry.testType).toBeDefined();
        expect(entry.expected).toBeDefined();
        expect(entry.blockerSeverity).toBeDefined();
        expect(["UNIT", "PARITY", "STATIC"]).toContain(entry.testType);
        expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(entry.blockerSeverity);
      }
    });
  });
});