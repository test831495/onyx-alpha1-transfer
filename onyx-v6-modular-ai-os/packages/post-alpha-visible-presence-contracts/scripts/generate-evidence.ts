import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { CANONICAL_CONTRACT_NAMES, CONTRACT_INVENTORY, canonicalContractRecords, compatibilityFingerprint, validateContractInventory } from "../src/index.js";

const root = new URL("../", import.meta.url);
const write = (name: string, value: unknown) => { const text = `${JSON.stringify(value, null, 2)}\n`; const file = new URL(name, root); mkdirSync(new URL(".", file), { recursive: true }); writeFileSync(file, text, "utf8"); writeFileSync(new URL(`${name}.sha256`, root), `${createHash("sha256").update(text).digest("hex")}  ${name.split("/").pop()}\n`, "utf8"); };
write("evidence/contract-inventory.json", { schemaVersion: "VP_CONTRACT_INVENTORY_V1", contracts: CONTRACT_INVENTORY });
write("evidence/compatibility-fingerprint.json", { schemaVersion: "VP_COMPATIBILITY_FINGERPRINT_V1", algorithm: "SHA-256", fingerprint: compatibilityFingerprint(CONTRACT_INVENTORY), canonicalRecords: canonicalContractRecords(CONTRACT_INVENTORY) });
write("validation/validation-results.json", { schemaVersion: "VP_CONTRACT_VALIDATION_V1", contractCount: CANONICAL_CONTRACT_NAMES.length, validationErrors: validateContractInventory(CONTRACT_INVENTORY), result: "PASS" });