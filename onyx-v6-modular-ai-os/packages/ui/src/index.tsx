import type { PropsWithChildren } from 'react';
export function GlassPanel({title,children,className='' }:PropsWithChildren<{title:string;className?:string}>){return <section className={`glass-panel ${className}`}><header>{title}<span>•••</span></header><div className="panel-body">{children}</div></section>}
export function Meter({label,value,color='cyan'}:{label:string;value:number;color?:string}){return <div className="meter"><div><span>{label}</span><b>{value}%</b></div><i><em style={{width:`${value}%`,background:color}}/></i></div>}
