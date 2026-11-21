import type {Analysis} from '@/lib/types';

export type ResearchMonitor={
  event_id:string;
  observed_on:string;
  monitor_until:string;
  source_key:string;
  changes:string[];
  evidence_urls:string[];
  funnel_hypothesis:string;
};
export type ResearchDecision={
  funnel:'landing'|'whatsapp'|'hybrid'|'undecided';
  funnel_reason:string;
};

export function researchMonitor(a:Analysis):ResearchMonitor|null {
  const row=(a.breakdown as Record<string,unknown>)?.research_monitor;
  if(!row||typeof row!=='object'||Array.isArray(row))return null;
  const v=row as Partial<ResearchMonitor>;
  if(typeof v.observed_on!=='string')return null;
  return {
    event_id:typeof v.event_id==='string'?v.event_id:'',
    observed_on:v.observed_on,
    monitor_until:typeof v.monitor_until==='string'?v.monitor_until:'',
    source_key:typeof v.source_key==='string'?v.source_key:'',
    changes:Array.isArray(v.changes)?v.changes.filter((x):x is string=>typeof x==='string'):[],
    evidence_urls:Array.isArray(v.evidence_urls)?v.evidence_urls.filter((x):x is string=>typeof x==='string'):[],
    funnel_hypothesis:typeof v.funnel_hypothesis==='string'?v.funnel_hypothesis:'',
  };
}
export function researchDecision(a?:Analysis):ResearchDecision|null {
  const row=(a?.breakdown as Record<string,unknown>|undefined)?.research_decision;
  if(!row||typeof row!=='object'||Array.isArray(row))return null;
  const v=row as Partial<ResearchDecision>;
  const allowed=['landing','whatsapp','hybrid','undecided'];
  if(!allowed.includes(v.funnel||''))return null;
  return {funnel:v.funnel!,funnel_reason:typeof v.funnel_reason==='string'?v.funnel_reason:''};
}
export const funnelLabels={
  landing:'Página de vendas → checkout',
  whatsapp:'WhatsApp consultivo',
  hybrid:'Página + WhatsApp opcional',
  undecided:'Funil ainda indefinido',
};
export function researchProgress(logs:Analysis[],until:string,now=new Date()){
  const valid=logs.map(researchMonitor).filter((row):row is ResearchMonitor=>!!row);
  const uniqueDates=[...new Set(valid.map(row=>row.observed_on))];
  const urls=[...new Set(valid.flatMap(row=>row.evidence_urls))];
  const endsAt=until?new Date(until+'T23:59:59-03:00'):new Date(NaN);
  return {
    observations:valid.length,days:uniqueDates.length,evidenceCount:urls.length,
    periodCompleted:Number.isFinite(endsAt.getTime())&&now>=endsAt,
    enoughForReview:uniqueDates.length>=7&&urls.length>=2&&Number.isFinite(endsAt.getTime())&&now>=endsAt,
  };
}
export function canRecommendTest(analysis:Analysis|null,progress:ReturnType<typeof researchProgress>){
  return !!analysis&&analysis.kind==='openai_audit'&&analysis.verdict==='approve'&&
    analysis.score>=85&&analysis.confidence!=='low'&&progress.enoughForReview;
}
