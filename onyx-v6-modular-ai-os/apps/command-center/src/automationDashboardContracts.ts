export type UiJobState="PLANNED"|"AWAITING_SCOPE_APPROVAL"|"APPROVED"|"PRECHECKED"|"BRANCH_READY"|"VALIDATING"|"REPAIRING"|"EVIDENCE_READY"|"AWAITING_DRAFT_PR_APPROVAL"|"DRAFT_PR_CREATED"|"NEEDS_REVIEW"|"FAILED_POLICY"|"CANCELLED";
export type UiTab="create"|"execute"|"overview"|"queue"|"approvals"|"validation"|"evidence"|"draft-prs"|"history";
export interface UiGate{id:string;label:string;status:"passed"|"failed"|"pending";detail:string}
export interface UiEvent{id:string;at:string;label:string;detail:string}
export interface UiJob{jobId:string;issueNumber:number;title:string;repository:string;state:UiJobState;risk:"low"|"medium"|"high"|"critical";scopeHash:string;planId:string;branch:string;baseCommit:string;validation:{passed:number;failed:number;total:number;gates:UiGate[]};repairAttempts:number;evidence:{ready:boolean;filesChanged:string[];knownIssues:string[];rollback:string[]};draftPr?:{number:number;url:string;draft:true;state:"OPEN"|"CLOSED"};events:UiEvent[];updatedAt:string}
export interface UiSnapshot{schemaVersion:"1.0";source:"E5_DASHBOARD_SERVICE";generatedAt:string;jobs:UiJob[];mergeAllowed:false;productionDeployAllowed:false}
