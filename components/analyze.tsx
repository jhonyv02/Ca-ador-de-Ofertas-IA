'use client';
import { useState } from 'react';
import { BrainCircuit, LoaderCircle, Sparkles, ShieldAlert, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import type { Analysis } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { Feedback, ScoreRing } from '@/components/ui';
import {useLocale} from '@/components/locale';
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
export function AnalysisReport({analysis}:{analysis:Analysis}){
  return <div className="ai-block"><div className="flex between center gap-3"><div><div className="ai-title"><BrainCircuit size={18}/> <strong>Relatório de inteligência artificial</strong></div><p style={{color:'#c1d6d9',margin:'0 0 8px',fontSize:12}}>{analysis.summary}</p><small>Análise de {new Date(analysis.created_at).toLocaleDateString('pt-BR')} · Confiança: {analysis.confidence==='high'?'alta':analysis.confidence==='medium'?'média':'baixa'}</small></div><ScoreRing value={analysis.score}/></div>
    <div className="analysis-grid"><div><h3>O que favorece a oferta</h3><ul>{analysis.strengths.length?analysis.strengths.map((x,i)=><li key={i}>{x}</li>):<li>Dados insuficientes.</li>}</ul></div><div><h3>Riscos e dúvidas</h3><ul>{analysis.risks.length?analysis.risks.map((x,i)=><li key={i}>{x}</li>):<li>Sem informação suficiente.</li>}</ul></div><div><h3>Ideias para diferenciar</h3><ul>{analysis.opportunities.length?analysis.opportunities.map((x,i)=><li key={i}>{x}</li>):<li>Adicionar mais evidências.</li>}</ul></div><div><h3>Composição da nota</h3>{metrics.map(m=>{const score=Number(analysis.breakdown?.[m.key]||0);return <div className="breakdown-item" key={m.key}><div className="breakdown-label"><span>{m.label}</span><span>{score}/{m.max}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${100*score/m.max}%`}}/></div></div>;})}</div></div>
    <div className="info-note mt-2"><strong>Próxima decisão:</strong> {analysis.recommendation}</div>
    <p className="micro" style={{margin:'14px 0 0'}}>A IA utiliza somente as informações, anotações e imagens disponibilizadas aqui. Não tem acesso automático a vendas, ROI ou custos reais do concorrente.</p>
  </div>;
}
