import type{RepairProposal}from"./validation-contracts.js";
const prohibited=["gh pr merge","netlify deploy","git push origin main","git push origin integration/onyx-nova","git reset --hard","git clean -fd","rm -rf","printenv","cat .env"];
export function fileAllowed(file:string,allowed:string[]){return!file.startsWith("/")&&!file.includes("..")&&allowed.some(x=>file===x||file.startsWith(x.endsWith("/")?x:`${x}/`))}
export function validateRepair(proposal:RepairProposal,allowed:string[]){const reasons:string[]=[];for(const f of proposal.files)if(!fileAllowed(f,allowed))reasons.push(`Unapproved file: ${f}`);for(const c of proposal.commands)if(prohibited.some(x=>c.includes(x)))reasons.push(`Prohibited command: ${c}`);return{allowed:reasons.length===0,reasons}}
export function secretLike(text:string){return/(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-]{12,}/i.test(text)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)}
