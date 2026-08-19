export type ExecutionState="PLANNED"|"AWAITING_SCOPE_APPROVAL"|"APPROVED"|"PRECHECKED"|"BRANCH_READY"|"WORKSPACE_READY"|"REJECTED"|"FAILED";
export interface ApprovedPlanRef{planId:string;scopeHash:string;repository:string;baseBranch:string;proposedBranch:string;approvedBy:string;approvedAt:string;approvalReason:string}
export interface ExecutionRequest{plan:ApprovedPlanRef;presentedScopeHash:string;currentRepository:string;currentBranch:string;workingTreeClean:boolean;allowedFiles:string[];requestedCommands:string[];dryRun?:boolean}
export interface ProvenanceRecord{planId:string;scopeHash:string;repository:string;baseBranch:string;proposedBranch:string;approvedBy:string;approvalReason:string;createdAt:string;mode:"dry-run"|"live-local"}
export interface ExecutionResult{state:ExecutionState;allowed:boolean;commands:string[];provenance:ProvenanceRecord;violations:string[];audit:string[]}
