export type LiveMode="DRY_RUN"|"LIVE_APPROVED";
export interface LiveApproval{approvedBy:string;approvedAt:string;reason:string;scopeHash:string;expiresAt?:string;actions:readonly ("READ_ISSUE"|"CREATE_BRANCH"|"PUSH_BRANCH"|"CREATE_DRAFT_PR")[]}
export interface RepositoryContext{repository:string;expectedOwner:string;expectedName:string;authenticatedLogin:string;defaultBranch:string;currentRemote:string}
export interface LiveAdapterRequest{mode:LiveMode;repository:string;issueNumber:number;scopeHash:string;baseBranch:string;headBranch:string;approval?:LiveApproval}
export interface LiveIssue{number:number;title:string;body:string;labels:string[];state:"OPEN"|"CLOSED";url:string}
export interface LiveBranchResult{created:boolean;branch:string;baseSha:string;remotePushed:false}
export interface LiveDraftPrInput{title:string;body:string;baseBranch:string;headBranch:string;labels:string[];idempotencyKey:string}
export interface LiveDraftPrResult{created:boolean;number?:number;url?:string;draft:true;idempotent:boolean}
export interface LiveAuditRecord{at:string;action:string;mode:LiveMode;repository:string;scopeHash:string;actor:string;approved:boolean;redactedDetail:string}
export interface GitHubReadAdapter{authenticatedLogin():Promise<string>;repositoryContext(repository:string):Promise<{owner:string;name:string;defaultBranch:string;remote:string}>;readIssue(repository:string,issueNumber:number):Promise<LiveIssue>;branchExists(repository:string,branch:string):Promise<boolean>;findDraftPr(repository:string,idempotencyKey:string):Promise<{number:number;url:string;draft:boolean}|null>}
export interface GitHubWriteAdapter{createLocalBranch(repository:string,baseBranch:string,headBranch:string):Promise<{branch:string;baseSha:string}>;pushIsolatedBranch(repository:string,headBranch:string):Promise<void>;createDraftPr(repository:string,input:LiveDraftPrInput):Promise<{number:number;url:string;draft:boolean}>}
