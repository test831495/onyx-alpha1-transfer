export interface CommandResult{stdout:string;stderr:string;exitCode:number}
export interface CommandRunner{run(args:string[]):Promise<CommandResult>}
export interface GitHubReadEvidence<T>{operation:string;repository?:string;readOnly:true;remoteMutationPerformed:false;retrievedAt:string;data:T}
export interface GitHubHealth{authenticated:boolean;account?:string;repositoryAccessible:boolean;rateLimitRemaining?:number;diagnostic:string}
