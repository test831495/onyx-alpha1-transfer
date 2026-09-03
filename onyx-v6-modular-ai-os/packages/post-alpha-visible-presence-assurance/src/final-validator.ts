import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
  
export type FinalRequirementRow = {
    readonly requirementId: string;
    readonly family: string;
    readonly ownerLane: string;
    readonly acceptanceId: string;
    readonly normativeRequirement?: string;
    readonly implementationPath: string;
    readonly implementationFileSha256?: string;
    readonly positiveTestIds: readonly string[];
    readonly negativeTestIds: readonly string[];
    readonly testFile?: string;
    readonly testFileSha256?: string;
    readonly evidencePath: string;
    readonly evidenceSha256: string;
    readonly EVIDENCE_SHA256?: string;
    readonly freshnessInputs: readonly string[];
    readonly completionState: string;
    readonly flags?: string;
    readonly activation?: string;
};
  
export type FinalValidationContext = {
    readonly expectedBaselineSha: string;
    readonly expectedCompatibilityFingerprint: string;
    readonly expectedOwnerLaneCounts: Readonly<Record<string, number>>;
    readonly candidateRoots: Readonly<Record<string, string>>;
    readonly candidatePackageRoots: Readonly<Record<string, string>>;
    readonly expectedCanonicalHashes: Readonly<Record<string, string>>;
    readonly expectedEvidencePath: string;
    readonly testSources?: Readonly<Record<string, string>>;
};
  
export type FinalValidation = {
    readonly valid: boolean;
    readonly totalRows: number;
    readonly implementationMappingsVerified: number;
    readonly positiveMappingsVerified: number;
    readonly negativeMappingsVerified: number;
    readonly evidenceHashesVerified: number;
    readonly freshnessVerified: number;
    readonly implementationFileHashesVerified?: number;
    readonly testFileHashesVerified?: number;
    readonly errors: readonly string[];
};

  const TRAIN1_OWNER_CANONICAL_HASHES = {
    runtime: "582a6f77e1413b4705b15badc92145b8d5a5ee00fe044964cb9dadb5a22bbbd9",
    renderer: "e72ce27564c0668c251824e3c3cf8f38bfbd59ea8a199b7dc36bbae5d1440590",
    world: "569e7bf39eb3ccac1f747b225694aaafe9297b8ac1e09a147e978e771597bfbd",
    tv: "98d000ef880635ed78d5637a74902f2badc2efaae03bea42a8571f5f4d15e096",
  } as const;

  export function validateCandidateAssuranceMetadata(metadata: unknown): string[] {
    if (!metadata || typeof metadata !== "object") return ["ASSURE_CANDIDATE_METADATA_INVALID"];
    const value = metadata as { canonicalCandidateHashes?: unknown; assureCanonicalHashDisposition?: unknown };
    if (value.assureCanonicalHashDisposition === undefined) return ["ASSURE_EXTERNAL_HASH_DISPOSITION_MISSING"];
    if (value.assureCanonicalHashDisposition !== "EXTERNAL_PROMOTION_RECEIPT_ONLY") return ["ASSURE_EXTERNAL_HASH_DISPOSITION_INVALID"];
    if (!value.canonicalCandidateHashes || typeof value.canonicalCandidateHashes !== "object") return ["ASSURE_CANONICAL_HASHES_INVALID"];
    const hashes = value.canonicalCandidateHashes as Record<string, unknown>;
    const errors: string[] = [];
    if ("assure" in hashes) errors.push("ASSURE_SELF_REFERENTIAL_HASH_PROHIBITED");
    for (const key of Object.keys(TRAIN1_OWNER_CANONICAL_HASHES)) {
      if (hashes[key] === undefined) errors.push("ASSURE_OWNER_HASH_MISSING");
      else if (hashes[key] !== TRAIN1_OWNER_CANONICAL_HASHES[key as keyof typeof TRAIN1_OWNER_CANONICAL_HASHES]) errors.push(`ASSURE_OWNER_HASH_MISMATCH:${key}`);
    }
    if (Object.keys(hashes).some((key) => !(key in TRAIN1_OWNER_CANONICAL_HASHES))) errors.push("ASSURE_UNKNOWN_CANONICAL_HASH_KEY");
    return errors;
  }
  
  const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");
  const error = (code: string, id?: string): string => id ? `${code}:${id}` : code;
  const inside = (root: string, candidate: string): boolean => {
    const rootPath = resolve(root);
    const candidatePath = resolve(candidate);
    return candidatePath === rootPath || relative(rootPath, candidatePath) !== "" && !relative(rootPath, candidatePath).startsWith("..") && !isAbsolute(relative(rootPath, candidatePath));
  };
  const safeFile = (root: string, packageRoot: string, path: string): string | undefined => {
    if (!path || isAbsolute(path) || path.split("/").includes("..") || path.includes("\\") || path.includes("node_modules") || path.endsWith("pnpm-lock.yaml")) return undefined;
    const full = resolve(root, path);
    if (!inside(packageRoot, full) || !statSafe(full)?.isFile()) return undefined;
    return full;
  };
  const statSafe = (path: string) => { try { return statSync(path); } catch { return undefined; } };
  const sourceFor = (context: FinalValidationContext, path: string): string | undefined => {
    if (context.testSources?.[path] !== undefined) return context.testSources[path];
    try { return readFileSync(path, "utf8"); } catch { return undefined; }
  };
  const canonicalCandidateHash = (root: string): string | undefined => {
    try {
      const files: Array<{ path: string; bytes: Buffer }> = [];
      const visit = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (entry.name === "node_modules") continue;
          const full = join(directory, entry.name);
          if (entry.isSymbolicLink()) continue;
          if (entry.isDirectory()) visit(full);
          else if (entry.isFile()) files.push({ path: relative(root, full).split("\\").join("/"), bytes: readFileSync(full) });
        }
      };
      visit(root);
      files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
      const framed = Buffer.concat(files.map(({ path, bytes }) => Buffer.concat([Buffer.from(path), Buffer.from([0]), Buffer.from(String(bytes.length)), Buffer.from([0]), bytes, Buffer.from([0])] )));
      return sha256(framed);
    } catch { return undefined; }
  };
  const canonicalRow = (row: FinalRequirementRow): string => {
    const copy = { ...row } as Record<string, unknown>;
    delete copy.EVIDENCE_SHA256;
    const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value as object).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}` : JSON.stringify(value);
    return canonical(copy);
  };
  
  export function validateFinalRequirements(rows: readonly FinalRequirementRow[], availablePaths: ReadonlySet<string>, context?: FinalValidationContext): FinalValidation {
    const errors: string[] = [];
    const ids = new Set<string>();
    const acceptanceIds = new Set<string>();
    const ownerCounts = new Map<string, number>();
    let implementationMappingsVerified = 0;
    let positiveMappingsVerified = 0;
    let negativeMappingsVerified = 0;
    let evidenceHashesVerified = 0;
    let freshnessVerified = 0;
    let implementationFileHashesVerified = 0;
    let testFileHashesVerified = 0;
    const canonicalHashes = new Map<string, string | undefined>();
    if (rows.length !== 110) errors.push(`expected 110 rows, received ${rows.length}`);
    for (const row of rows) {
      const id = row.requirementId;
      if (ids.has(id)) errors.push(context ? error("DUPLICATE_REQUIREMENT_ID", id) : `duplicate requirement: ${id}`);
      ids.add(id);
      if (acceptanceIds.has(row.acceptanceId)) errors.push(context ? error("DUPLICATE_ACCEPTANCE_ID", row.acceptanceId) : `duplicate acceptance: ${row.acceptanceId}`);
      acceptanceIds.add(row.acceptanceId);
      ownerCounts.set(row.ownerLane, (ownerCounts.get(row.ownerLane) ?? 0) + 1);
      if (context) {
        const root = context.candidateRoots[row.ownerLane];
        const packageRoot = context.candidatePackageRoots[row.ownerLane];
        if (!root || !packageRoot) errors.push(error("OWNER_LANE_PARTITION_MISMATCH", id));
        const implementation = root && packageRoot ? safeFile(root, packageRoot, row.implementationPath) : undefined;
        if (!implementation) errors.push(error("IMPLEMENTATION_PATH_INVALID", id));
        else if (row.implementationFileSha256 !== sha256(readFileSync(implementation))) errors.push(error("IMPLEMENTATION_FILE_HASH_MISMATCH", id));
        else { implementationMappingsVerified++; implementationFileHashesVerified++; }
        const test = root && packageRoot && row.testFile ? safeFile(root, packageRoot, row.testFile) : undefined;
        if (!test) errors.push(error("TEST_PATH_INVALID", id));
        else if (row.testFileSha256 !== sha256(readFileSync(test))) errors.push(error("TEST_FILE_HASH_MISMATCH", id));
        else { testFileHashesVerified++; const source = sourceFor(context, test); if (!source?.includes(`${id}-POS-001`)) errors.push(error("POSITIVE_TEST_ID_NOT_FOUND", id)); if (!source?.includes(`${id}-NEG-001`)) errors.push(error("NEGATIVE_TEST_ID_NOT_FOUND", id)); }
        const expectedEvidenceHash = row.EVIDENCE_SHA256 && sha256(canonicalRow(row));
        if (!row.EVIDENCE_SHA256) errors.push(error("ROW_EVIDENCE_HASH_MISSING", id));
        else if (row.EVIDENCE_SHA256 !== expectedEvidenceHash) errors.push(error("ROW_EVIDENCE_HASH_MISMATCH", id));
        else evidenceHashesVerified++;
        const freshness = row.freshnessInputs;
        const canonical = context.expectedCanonicalHashes[row.ownerLane];
        const testHash = row.testFileSha256;
        if (!canonical || !testHash || !freshness.includes(context.expectedBaselineSha) || !freshness.includes(context.expectedCompatibilityFingerprint) || !freshness.includes(canonical ?? "") || !freshness.includes(testHash ?? "")) errors.push(error("FRESHNESS_INPUT_MISSING", id));
        else {
          const canonicalRoot = packageRoot ?? "";
          const actualCanonical = canonicalHashes.has(canonicalRoot) ? canonicalHashes.get(canonicalRoot) : canonicalCandidateHash(canonicalRoot);
          canonicalHashes.set(canonicalRoot, actualCanonical);
          if (!actualCanonical || actualCanonical !== canonical) errors.push(error("OWNER_LANE_CANONICAL_HASH_MISMATCH", id));
          else freshnessVerified++;
        }
        if (row.evidencePath !== context.expectedEvidencePath) errors.push(error("EVIDENCE_PATH_INVALID", id));
        if (row.completionState !== "IMPLEMENTED_AND_TESTED") errors.push(error("COMPLETION_STATE_INVALID", id));
        if (row.flags !== undefined && row.flags !== "OFF") errors.push(error("FLAGS_NOT_OFF", id));
        if (row.activation !== undefined && row.activation !== "NONE") errors.push(error("ACTIVATION_NOT_NONE", id));
        if (row.positiveTestIds.length === 0) errors.push(error("POSITIVE_TEST_MAPPING_MISSING", id)); else positiveMappingsVerified++;
        if (row.negativeTestIds.length === 0) errors.push(error("NEGATIVE_TEST_MAPPING_MISSING", id)); else negativeMappingsVerified++;
      } else {
        if (availablePaths.has(row.implementationPath)) implementationMappingsVerified++; else errors.push(`missing implementation path: ${id}`);
        if (row.positiveTestIds.length > 0) positiveMappingsVerified++; else errors.push(`missing positive test: ${id}`);
        if (row.negativeTestIds.length > 0) negativeMappingsVerified++; else errors.push(`missing negative or invariant test: ${id}`);
        if (row.evidencePath && row.evidenceSha256) evidenceHashesVerified++; else errors.push(`missing evidence hash: ${id}`);
        if (row.freshnessInputs.length > 0) freshnessVerified++; else errors.push(`missing freshness input: ${id}`);
        if (row.completionState !== "IMPLEMENTED_AND_TESTED") errors.push(`incomplete row: ${id}`);
      }
    }
    if (context) for (const [lane, expected] of Object.entries(context.expectedOwnerLaneCounts)) if (ownerCounts.get(lane) !== expected) errors.push(error("OWNER_LANE_PARTITION_MISMATCH", lane));
    return Object.freeze({ valid: errors.length === 0, totalRows: rows.length, implementationMappingsVerified, positiveMappingsVerified, negativeMappingsVerified, evidenceHashesVerified, freshnessVerified, implementationFileHashesVerified, testFileHashesVerified, errors: Object.freeze(errors) });
  }
