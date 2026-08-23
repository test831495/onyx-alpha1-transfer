export type ApprovalAction="APPROVE_SCOPE"|"REJECT_SCOPE"|"APPROVE_DRAFT_PR"|"REJECT_DRAFT_PR";
export interface ApprovalDecision{decisionId:string;action:ApprovalAction;approvedBy:"Rahul Kumar";reason:string;scopeHash:string;issueNumber:number;createdAt:string;expiresAt?:string;remoteMutationPerformed:false;mergeAllowed:false;productionDeployAllowed:false}
export interface ApprovalValidation{allowed:boolean;violations:string[]}
