import type { AutomationStatus } from "./contracts";
export interface ExecutionPlan<T=unknown>{id:string;capabilityId:string;repository:string;baseBranch?:string;workingBranch?:string;payload:T;dryRun:true;approvalRequired:boolean;scopeHash:string;createdAt:string}
export interface ApprovalRecord{planId:string;scopeHash:string;approver:string;approvedAt:string;expiresAt:string}
export interface ValidationRecord{name:string;passed:boolean;detail:string}
export interface RecoveryCheckpoint{repository:string;branch:string;startCommit:string;createdAt:string}
export interface AutomationJob<T=unknown>{id:string;status:AutomationStatus;plan:ExecutionPlan<T>;approval?:ApprovalRecord;attempts:number;auditIds:string[];validations:ValidationRecord[];checkpoint?:RecoveryCheckpoint}
