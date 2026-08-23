export type IntakeRisk="low"|"medium"|"high"|"critical";
export interface NaturalLanguageIntakeInput{goal:string;repository:string;baseBranch:string;requestedBy:"Rahul Kumar";allowedPaths:string[]}
export interface AutomationIssueDraft{draftId:string;title:string;body:string;objective:string;acceptanceCriteria:string[];risk:IntakeRisk;riskReasons:string[];allowedPaths:string[];prohibitedActions:string[];validationPlan:string[];rollbackPlan:string[];repository:string;baseBranch:string;requestedBy:"Rahul Kumar";scopeHash:string;state:"DRAFT_AWAITING_REVIEW";remoteIssueCreated:false;executionStarted:false;mergeAllowed:false;productionDeployAllowed:false;createdAt:string}
export interface IntakeValidation{allowed:boolean;violations:string[]}
