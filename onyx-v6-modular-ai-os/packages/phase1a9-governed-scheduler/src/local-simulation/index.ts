/**
 * Phase 1A.9 Wave 5A: Local Simulation Module
 *
 * Exports all simulation infrastructure for deterministic scheduler scenarios.
 */

export * from "./simulation-contracts";
export * from "./scenario-registry";
export {
  runSchedulerSimulationScenario,
  runAllSchedulerSimulations,
  verifyDeterministicReplay,
  SimulationRunnerConfig,
  SimulationRunAggregatedResult,
} from "./simulation-runner";
export * from "./fault-injection";
export {
  EvidenceArtifactReference,
  EvidenceManifestProjection,
  SimulationEvidenceSummary,
  createEvidenceArtifactReference,
  createSimulationEvidenceSummary,
  createEvidenceManifestProjection,
  EvidenceCoverageMapper,
  FailureMatrixProjection,
  createFailureMatrixProjection,
} from "./simulation-evidence";
export * from "./failure-matrix";
