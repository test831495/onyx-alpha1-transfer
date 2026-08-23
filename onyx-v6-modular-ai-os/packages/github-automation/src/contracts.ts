export interface IssueInput{title:string;body:string;labels?:string[]}
export interface BranchInput{name:string;from:string}
export interface PullRequestInput{title:string;body:string;base:string;head:string;draft:true}
export type GitHubDryRunResult<T>={operation:string;simulated:true;remoteMutationPerformed:false;approvalRequired:boolean;payload:T;warnings:string[]}
