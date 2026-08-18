import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ProviderState = "disabled" | "unconfigured" | "configured" | "healthy" | "error";
type ProviderHealth = { provider:string; role:string; state:ProviderState; missing:string[]; credentialDetected:boolean; diagnostic:string };
type HealthSnapshot = { generatedAt:string; environment:string; production:{deploymentAllowed:boolean;liveNetlifyUpdatesAllowed:boolean}; routing:Record<string,string[]>; providers:ProviderHealth[] };

const providerLabels:Record<string,string>={microsoft:"Microsoft Workspace",azureSpeech:"Azure Speech",azureAI:"Azure AI (OnyxNova)",google:"Google Workspace",gemini:"Google Gemini",openai:"OpenAI",elevenLabs:"ElevenLabs",yahoo:"Yahoo",github:"GitHub Automation"};
const colors:Record<ProviderState,string>={disabled:"#718096",unconfigured:"#d97706",configured:"#0ea5a8",healthy:"#16a34a",error:"#dc2626"};
const panel:CSSProperties={position:"fixed",right:20,bottom:76,width:"min(620px, calc(100vw - 32px))",maxHeight:"min(720px, calc(100vh - 120px))",overflow:"auto",zIndex:10000,background:"rgba(5,15,31,.98)",color:"#eaf7ff",border:"1px solid rgba(37,212,242,.55)",borderRadius:18,boxShadow:"0 22px 80px rgba(0,0,0,.55)",padding:18,backdropFilter:"blur(18px)"};
const button:CSSProperties={position:"fixed",right:20,bottom:20,zIndex:10001,border:"1px solid rgba(37,212,242,.75)",borderRadius:999,padding:"11px 16px",background:"#071a30",color:"#dff9ff",fontWeight:700,cursor:"pointer",boxShadow:"0 8px 28px rgba(0,0,0,.4)"};

export function ProviderHealthDashboard(){
 const[open,setOpen]=useState(false);const[data,setData]=useState<HealthSnapshot>();const[error,setError]=useState("");
 const load=()=>fetch(`/provider-health.generated.json?ts=${Date.now()}`,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`Health snapshot unavailable (${r.status})`);return r.json()}).then(setData).catch(e=>setError(e instanceof Error?e.message:"Health snapshot unavailable"));
 useEffect(()=>{load()},[]);
 const counts=useMemo(()=>data?.providers.reduce((a,p)=>(a[p.state]=(a[p.state]??0)+1,a),{} as Record<string,number>)??{},[data]);
 return <><button type="button" style={button} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Provider Health</button>{open&&<section style={panel} aria-label="Provider Health Dashboard">
  <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",marginBottom:16}}><div><h2 style={{margin:0,fontSize:22}}>Provider Health</h2><p style={{margin:"6px 0 0",color:"#9ec6d8",fontSize:13}}>Configuration-only diagnostics. Secret values are never displayed.</p></div><button type="button" onClick={load} style={{...button,position:"static",padding:"8px 12px"}}>Refresh</button></header>
  {error&&<div style={{padding:12,border:"1px solid #dc2626",borderRadius:10,color:"#fecaca",marginBottom:12}}>{error}. Run the provider-health generator and refresh.</div>}
  {data&&<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
    <Summary label="Environment" value={data.environment}/><Summary label="Configured" value={String(counts.configured??0)}/><Summary label="Disabled" value={String(counts.disabled??0)}/><Summary label="Needs config" value={String(counts.unconfigured??0)}/>
   </div>
   <div style={{padding:12,borderRadius:12,background:"rgba(14,165,168,.1)",border:"1px solid rgba(14,165,168,.35)",marginBottom:14}}><strong>Production safety</strong><div style={{fontSize:13,marginTop:5}}>Deployment: <b>{data.production.deploymentAllowed?"ALLOWED":"BLOCKED"}</b> • Live Netlify updates: <b>{data.production.liveNetlifyUpdatesAllowed?"ALLOWED":"BLOCKED"}</b></div></div>
   <div style={{display:"grid",gap:10}}>{data.providers.map(p=><article key={p.provider} style={{border:"1px solid rgba(148,197,218,.22)",borderRadius:12,padding:12,background:"rgba(255,255,255,.025)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><strong>{providerLabels[p.provider]??p.provider}</strong><div style={{color:"#8eb2c3",fontSize:12,marginTop:3}}>{p.role}</div></div><span style={{color:colors[p.state],fontWeight:800,textTransform:"uppercase",fontSize:12}}>{p.state}</span></div>
    <p style={{fontSize:13,color:"#bcd7e3",margin:"9px 0 0"}}>{p.diagnostic}</p>{p.missing.length>0&&<p style={{fontSize:12,color:"#f4c98b",margin:"6px 0 0"}}>Missing: {p.missing.join(", ")}</p>}
   </article>)}</div>
   <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(148,197,218,.2)",fontSize:12,color:"#8eb2c3"}}>Voice priority: {(data.routing.voice??[]).join(" → ")}<br/>Snapshot: {new Date(data.generatedAt).toLocaleString()}</div>
  </>}
 </section>}</>;
}
function Summary({label,value}:{label:string;value:string}){return <div style={{padding:11,borderRadius:11,background:"rgba(255,255,255,.04)",border:"1px solid rgba(148,197,218,.18)"}}><div style={{fontSize:11,color:"#8eb2c3",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:20,fontWeight:800,marginTop:3}}>{value}</div></div>}
