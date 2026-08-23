import type { EvidencePackage } from "./validation-contracts.js";
export type DraftPrState="DRAFT_PACKAGE_READY"|"AWAITING_DRAFT_PR_APPROVAL"|"DRAFT_PR_APPROVED"|"DRAFT_PR_CREATED"|"REJECTED"|"FAILED_POLICY";
export interface DraftPrApproval{approvedBy:string;approvedAt:string;reason:string;scopeHash:string;expiresAt?:string}
export interface DraftPrPackage{schemaVersion:"1.0";state:DraftPrState;repository:string;baseBranch:string;headBranch:string;title:string;body:string;labels:string[];draft:true;scopeHash:string;evidenceDigest:string;idempotencyKey:string;approvalRequired:true;mergeAllowed:false;productionDeployAllowed:false}
export interface DraftPrRequest{evidence:EvidencePackage;baseBranch:string;headBranch:string;issueNumber:number;objective:string;riskLevel:string;securityImpact:string;costImpact:string;providerImpact:string;approval?:DraftPrApproval}
export interface DraftPrAdapter{findByIdempotencyKey(key:string):Promise<{number:number;url:string}|null>;createDraft(input:{repository:string;baseBranch:string;headBranch:string;title:string;body:string;labels:string[];idempotencyKey:string}):Promise<{number:number;url:string;draft:boolean}>}
export interface DraftPrCreationResult{state:DraftPrState;package:DraftPrPackage;pr?:{number:number;url:string;draft:boolean};violations:string[]}
