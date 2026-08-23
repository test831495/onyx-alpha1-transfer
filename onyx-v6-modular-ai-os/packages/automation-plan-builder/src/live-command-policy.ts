export interface SafeCommandResult{exitCode:number;stdout:string;stderr:string}
export interface SafeCommandExecutor{run(argv:string[]):Promise<SafeCommandResult>}
const allowed=[["gh","auth","status"],["gh","issue","view"],["git","remote","get-url"],["git","rev-parse"],["git","branch","--list"],["git","switch","-c"],["git","push","-u","origin"],["gh","pr","list"],["gh","pr","create","--draft"]];
export function commandAllowed(argv:string[]){return allowed.some(prefix=>prefix.every((v,i)=>argv[i]===v))&&!argv.includes("--admin")&&!argv.includes("--force")&&!argv.includes("--delete")}
export async function executeAllowlisted(executor:SafeCommandExecutor,argv:string[]){if(!commandAllowed(argv))throw Error(`Command not allowlisted: ${argv.join(" ")}`);return executor.run(argv)}
