import type {ApprovalRecord,ExecutionPlan} from "./job";
import { isCurrentScopeHash } from "./scope-hash";
export function createApproval(plan:ExecutionPlan,approver:string,ttlMs=900000):ApprovalRecord{const now=Date.now();return{planId:plan.id,scopeHash:plan.scopeHash,approver,approvedAt:new Date(now).toISOString(),expiresAt:new Date(now+ttlMs).toISOString()}}
export function approvalValid(plan:ExecutionPlan,approval:ApprovalRecord|undefined,now=Date.now()):boolean{return Boolean(approval&&isCurrentScopeHash(plan.scopeHash)&&isCurrentScopeHash(approval.scopeHash)&&approval.planId===plan.id&&approval.scopeHash===plan.scopeHash&&Date.parse(approval.expiresAt)>now)}
