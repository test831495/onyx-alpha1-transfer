export type FailureClass="TYPECHECK_FAILURE"|"TEST_FAILURE"|"BUILD_FAILURE"|"CONTRACT_FAILURE"|"BOUNDARY_VIOLATION"|"PROHIBITED_CAPABILITY"|"SECRET_EXPOSURE_RISK"|"ENVIRONMENT_FAILURE"|"UNKNOWN_FAILURE";
export type OrchestratorState="VALIDATING"|"REPAIRING"|"VALIDATED"|"EVIDENCE_READY"|"NEEDS_REVIEW"|"FAILED_POLICY"|"CANCELLED";
export interface Gate{ id:string; command:string; purpose:string; required:boolean }
export interface GateResult{ id:string; command:string; exitCode:number; stdout:string; stderr:string; durationMs:number; passed:boolean; failureClass?:FailureClass }
export interface RepairProposal{ id:string; failureClass:FailureClass; files:string[]; description:string; commands:string[] }
export interface RepairAttempt{ attempt:number; proposal:RepairProposal; accepted:boolean; reason:string; gateResults:GateResult[] }
export interface OrchestratorInput{ planId:string; scopeHash:string; approvedScopeHash:string; repository:string; branch:string; baseCommit:string; allowedFiles:string[]; gates:Gate[]; maxRepairAttempts?:number }
export interface EvidencePackage{ schemaVersion:"1.0"; planId:string; scopeHash:string; repository:string; branch:string; baseCommit:string; state:OrchestratorState; startedAt:string; completedAt:string; gateResults:GateResult[]; repairAttempts:RepairAttempt[]; filesChanged:string[]; diffStat:string; safety:{boundaryPassed:boolean;secretScanPassed:boolean;prohibitedCapabilityPassed:boolean}; knownIssues:string[]; rollback:string[] }
export interface OrchestratorResult{ state:OrchestratorState; evidence:EvidencePackage; failureClass?:FailureClass }
export interface CommandRunner{ run(command:string):Promise<{exitCode:number;stdout:string;stderr:string;durationMs:number}> }
export interface RepairAdapter{ propose(failure:GateResult,attempt:number):Promise<RepairProposal|null>; apply(proposal:RepairProposal):Promise<{filesChanged:string[]}> }
