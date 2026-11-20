'use client';
import { useState } from 'react';
import { BrainCircuit, LoaderCircle, Sparkles } from 'lucide-react';
import type { Analysis, AuditVerdict } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { Feedback, ScoreRing } from '@/components/ui';
import {useLocale} from '@/components/locale';
import {researchBars} from '@/lib/digital-radar';

export function AnalyzeButton({productId,adId}:{productId:string;adId?:string}){
  const {refresh}=useWorkspace();const {locale}=useLocale();const [pending,setPending]=useState(false);const [error,setError]=useState('');
  async function analyze(){setPending(true);setError('');
    try{const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,adId,locale})});
      const json=await res.json();if(!res.ok)throw new Error(json.error||'Falha na análise');await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Erro na análise');}finally{setPending(false);}
  }
  return <div><button className="btn btn-primary" onClick={analyze} disabled={pending}>{pending?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>} {pending?'Analisando evidências...':adId?'Analisar anúncio com IA':'Analisar produto com IA'}</button>{error&&<div className="mt-2"><Feedback type="error">{error}</Feedback></div>}</div>;
}
const metrics=[{key:'demand',label:'Demanda e concorrência',max:20},{key:'offer',label:'Oferta e copy',max:20},{key:'pain',label:'Dor e público-alvo',max:20},{key:'margin',label:'Margem e viabilidade',max:15},{key:'execution',label:'Facilidade de execução',max:15},{key:'risk',label:'Segurança e conformidade',max:10}] as const;
const verdictLabel:Record<AuditVerdict,string>={approve:'Aprovado',reject:'Reprovado',needs_work:'Precisa ajuste'};
function verdictClass(verdict:AuditVerdict){
  if(verdict==='approve')return 'pill pill-approve';
  if(verdict==='reject')return 'pill pill-reject';
  return 'pill pill-needs';
}
function numericScore(value:unknown){
  const score=typeof value==='number'?value:Number(value);
  return Number.isFinite(score)?score:0;
}
export function AnalysisReport({analysis}:{analysis:Analysis}){
  const research=researchBars(analysis.breakdown);
  const researched=Boolean(research)||analysis.model==='Grok Bot';
  const title=analysis.kind==='openai_audit'?'Auditoria OpenAI':researched?'Pesquisa do assistente':'Relatório de inteligência artificial';
  const verdict=analysis.verdict==='approve'||analysis.verdict==='reject'||analysis.verdict==='needs_work'?analysis.verdict:null;
  const blockers=Array.isArray(analysis.blockers)?analysis.blockers.filter(item=>typeof item==='string'&&item.trim()):[];
  return <div className="ai-block"><div className="flex between center gap-3"><div><div className="ai-title"><BrainCircuit size={18}/> <strong>{title}</strong>{verdict&&<> <span className={verdictClass(verdict)}>{verdictLabel[verdict]}</span></>}</div><p style={{color:'#c1d6d9',margin:'0 0 8px',fontSize:12}}>{analysis.summary}</p><small>Análise de {new Date(analysis.created_at).toLocaleDateString('pt-BR')} · Confiança: {analysis.confidence==='high'?'alta':analysis.confidence==='medium'?'média':'baixa'}{analysis.model?` · ${analysis.model}`:''}</small></div><ScoreRing value={analysis.score}/></div>
    {blockers.length>0&&<div className="info-note mt-2"><strong>Bloqueios</strong><ul style={{margin:'8px 0 0',paddingLeft:18}}>{blockers.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    <div className="analysis-grid"><div><h3>O que favorece a oferta</h3><ul>{analysis.strengths.length?analysis.strengths.map((x,i)=><li key={i}>{x}</li>):<li>Dados insuficientes.</li>}</ul></div><div><h3>Riscos e dúvidas</h3><ul>{analysis.risks.length?analysis.risks.map((x,i)=><li key={i}>{x}</li>):<li>Sem informação suficiente.</li>}</ul></div><div><h3>Ideias para diferenciar</h3><ul>{analysis.opportunities.length?analysis.opportunities.map((x,i)=><li key={i}>{x}</li>):<li>Adicionar mais evidências.</li>}</ul></div><div><h3>Composição da nota</h3>{research?research.map(bar=>{const width=bar.max>0?Math.min(100,100*bar.pontos/bar.max):0;return <div className="breakdown-item" key={bar.key}><div className="breakdown-label"><span>{bar.label}</span><span>{bar.pontos}/{bar.max||'—'}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${width}%`}}/></div>{bar.motivo&&<small className="criterion-note">{bar.motivo}</small>}</div>;}):metrics.map(m=>{const score=numericScore((analysis.breakdown as Record<string,unknown>|undefined)?.[m.key]);return <div className="breakdown-item" key={m.key}><div className="breakdown-label"><span>{m.label}</span><span>{score}/{m.max}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.min(100,100*score/m.max)}%`}}/></div></div>;})}</div></div>
    <div className="info-note mt-2"><strong>Próxima decisão:</strong> {analysis.recommendation}</div>
    <p className="micro" style={{margin:'14px 0 0'}}>{analysis.kind==='openai_audit'?'A nota é uma hipótese crítica. Não é probabilidade de venda, ROAS nem previsão de faturamento. ':''}A IA utiliza somente as informações, anotações e imagens disponibilizadas aqui. Não tem acesso automático a vendas, ROI ou custos reais do concorrente.</p>
  </div>;
}
