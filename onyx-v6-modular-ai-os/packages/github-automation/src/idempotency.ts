import{createScopeHash}from"@onyx/automation-foundation";export const idempotencyKey=(repository:string,operation:string,payload:unknown)=>createScopeHash({repository,operation,payload});
