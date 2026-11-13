'use client';
import type { ReactNode } from 'react';
import { X, LoaderCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {useLocale} from '@/components/locale';
export function PageHeading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow||'SEU WORKSPACE'}</div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action&&<div className="heading-actions">{action}</div>}</div>;
}
export function Section({title,description,action,children}:{title:string;description?:string;action?:ReactNode;children:ReactNode}){
  return <section className="panel"><div className="section-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>{children}</section>;
}
export function Modal({title,children,onClose,subtitle}:{title:string;children:ReactNode;onClose:()=>void;subtitle?:string}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button onClick={onClose} aria-label="Fechar" className="icon-button"><X size={20}/></button></div><div className="modal-body">{children}</div></div></div>;
}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}) {
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
export function Empty({icon,headline,description,action}:{icon?:ReactNode;headline:string;description:string;action?:ReactNode}){
  return <div className="empty-state"><div className="empty-icon">{icon||'◎'}</div><h3>{headline}</h3><p>{description}</p>{action}</div>;
}
export function Feedback({type,children}:{type:'error'|'success'|'info';children:ReactNode}){return <div className={`feedback ${type}`}>{type==='error'?<AlertCircle size={17}/>:<CheckCircle2 size={17}/>}<span>{children}</span></div>;}
export function Load({label='Carregando dados...'}:{label?:string}){return <div className="loading"><LoaderCircle className="spin" size={22}/>{label}</div>;}
export function StatusPill({value}:{value:string}) {const {t}=useLocale();return <span className={`pill pill-${value}`}>{t(value)}</span>;}
export function ScoreRing({value,size='md'}:{value:number;size?:'md'|'sm'}) {let color=value>=75?'#43e0a5':value>=45?'#efbd61':'#f58f8d';return <div className={`score-ring ${size}`} style={{'--score-color':color,'--score-deg':`${Math.max(0,Math.min(100,value))*3.6}deg`} as React.CSSProperties}><span>{value}</span></div>;}
