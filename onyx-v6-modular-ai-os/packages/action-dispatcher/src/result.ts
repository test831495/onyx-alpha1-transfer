import type {ActionResult} from "@onyx/contracts";
export const unsupportedResult=(code:string,message:string):ActionResult=>({status:"unsupported",code,message});
export const failedResult=(code:string,message:string,recoverable=true):ActionResult=>({status:"failed",code,message,recoverable});
export const cancelledResult=(message="Action cancelled."):ActionResult=>({status:"cancelled",message});
