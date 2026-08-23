import type { AutomationJob } from "./job";
export interface JobStore{save(job:AutomationJob):void;get(id:string):AutomationJob|undefined;list():AutomationJob[]}
export class InMemoryJobStore implements JobStore{private jobs=new Map<string,AutomationJob>();save(job:AutomationJob){this.jobs.set(job.id,structuredClone(job))}get(id:string){const j=this.jobs.get(id);return j?structuredClone(j):undefined}list(){return [...this.jobs.values()].map((job)=>structuredClone(job))}}
