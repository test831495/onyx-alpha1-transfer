export type OperationKind="read"|"write";
export interface RetryDecision{retry:boolean;delayMs:number;reason:string}
export function retryDecision(kind:OperationKind,attempt:number,status?:number):RetryDecision{if(kind==="write")return{retry:false,delayMs:0,reason:"Remote writes require idempotency and renewed execution authority."};if(attempt>=3)return{retry:false,delayMs:0,reason:"Read retry limit reached."};if(status===429||status===502||status===503)return{retry:true,delayMs:250*2**attempt,reason:"Transient read failure."};return{retry:false,delayMs:0,reason:"Failure is not retryable."}}
