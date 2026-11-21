'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {BookOpenCheck,CheckCircle2,Clock3,ExternalLink,FolderSearch,RefreshCw,ShieldAlert,Sparkles} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {PageHeading,Load,Feedback} from '@/components/ui';
import type {Analysis,Product} from '@/lib/types';
import {researchMonitor,researchDecision,researchProgress,funnelLabels} from '@/lib/research-pipeline';
import {safeHttpUrl} from '@/lib/utils';

type View='all'|'researching'|'ready';
function dateBR(iso:string){
  if(!iso)return 'Não informado';
  const d=new Date(iso.includes('T')?iso:iso+'T12:00:00Z');
  return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('pt-BR',{timeZone:'UTC'});
}
function AuditStatus({audit}:{audit?:Analysis}){
  if(!audit)return <span className="pill">Sem auditoria</span>;
  const title=audit.verdict==='approve'?'Favorável, sujeito a validação':
    audit.verdict==='reject'?'Não recomendado':'Observar / melhorar';
  const cls=audit.verdict==='approve'?'pill-approve':audit.verdict==='reject'?'pill-reject':'pill-needs';
  return <span className={'pill '+cls}>{title}</span>;
}
export default function ResearchPage(){
  const {products,analyses,loading,error,supabase,refresh}=useWorkspace();
  const [filter,setFilter]=useState<View>('all');
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const cases=useMemo(()=>products.map(product=>{
    const history=analyses.filter(a=>a.product_id===product.id&&a.kind==='product'&&a.model==='Grok Monitor');
    const audit=analyses.find(a=>a.product_id===product.id&&a.kind==='openai_audit');
    const latest=history.map(researchMonitor).find(x=>x?.monitor_until);
    const monitorUntil=latest?.monitor_until||'';
    const progress=researchProgress(history,monitorUntil);
    return {product,history,audit,progress,monitorUntil};
  }).filter(x=>x.history.length>0||x.product.status==='researching'||x.product.status==='ready')
    .sort((a,b)=>Number(b.product.status==='ready')-Number(a.product.status==='ready')||
      (b.history[0]?.created_at||b.product.updated_at).localeCompare(a.history[0]?.created_at||a.product.updated_at)),
    [products,analyses]);
  const shown=cases.filter(x=>filter==='all'||x.product.status===filter);
  async function setStage(product:Product,status:'researching'|'ready'){
    setBusy(product.id);setMessage('');setFailure('');
    try{
      const {error:saveError}=await supabase.from('products').update({status}).eq('id',product.id).eq('user_id',product.user_id);
      if(saveError)throw saveError;
      await refresh();
      setMessage(status==='ready'?'Oferta marcada para revisão de teste. Nenhuma campanha foi publicada.':'Oferta devolvida para observação.');
    }catch(e){setFailure(e instanceof Error?e.message:'Falha ao atualizar o status.');}
    finally{setBusy('');}
  }
  async function auditNow(product:Product){
    setBusy(product.id);setMessage('');setFailure('');
    try{
      const response=await fetch('/api/research/audit',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({product_id:product.id})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Não foi possível auditar a oferta.');
      await refresh();
      setMessage(result.promoted?'A análise marcou a oferta como pronta para sua revisão.':
        'Nova análise salva. Confira a recomendação e o funil abaixo.');
    }catch(e){setFailure(e instanceof Error?e.message:'Falha ao executar auditoria.');}
    finally{setBusy('');}
  }
  if(loading)return <Load/>;
  return <>
    <PageHeading eyebrow="PESQUISA CONTÍNUA · GROK + OPENAI" title="Ofertas em análise"
      description="Acompanhe cada dia da investigação, os links enviados pelo Grok e o parecer independente da OpenAI. Você decide quando testar."/>
    <div className="flex wrap gap-2 mb-2">
      {([['all','Todas'],['researching','Em observação'],['ready','Prontas para revisão']] as const).map(([key,label])=>
        <button key={key} type="button" className={'btn '+(filter===key?'btn-primary':'btn-ghost')}
          onClick={()=>setFilter(key)}>{label}</button>)}
      <button type="button" className="btn btn-ghost" onClick={()=>void refresh()}><RefreshCw size={15}/> Atualizar</button>
    </div>
    {error&&<Feedback type="error">{error}</Feedback>}
    {failure&&<Feedback type="error">{failure}</Feedback>}
    {message&&<Feedback type="success">{message}</Feedback>}
    {shown.length===0?<div className="panel" style={{padding:28}}>
      <FolderSearch size={30}/><h2 style={{margin:'10px 0'}}>Nenhuma oferta nesta etapa</h2>
      <p className="muted">Quando o Grok enviar uma investigação, ela aparecerá aqui com histórico e auditoria. Também é possível cadastrar uma oferta como "Pesquisando".</p>
      <Link className="btn btn-primary mt-2" href="/products">Abrir catálogo</Link>
    </div>:<div style={{display:'grid',gap:16}}>
      {shown.map(({product,history,audit,progress,monitorUntil})=>{
        const decision=researchDecision(audit);
        const busyThis=busy===product.id;
        const timeline=history.slice(0,14);
        return <section className="panel" key={product.id} style={{padding:20}}>
          <div className="flex between wrap gap-2 center">
            <div><div className="micro">{product.country||'Mercado não informado'} · {product.format||'Digital'}</div>
              <h2 style={{margin:'8px 0',fontSize:22}}>{product.name}</h2>
              <p className="muted" style={{maxWidth:720}}>{product.promise||'Promessa ainda não registrada.'}</p></div>
            <div style={{textAlign:'right'}}><AuditStatus audit={audit}/>
              <p className="micro mt-2">{product.status==='ready'?'Pronta para sua avaliação':product.status==='researching'?'Monitoramento em andamento':product.status}</p></div>
          </div>
          <div className="flex wrap gap-2 mt-3">
            <span className="card-tag"><Clock3 size={14}/> {progress.days} dia(s) registrados · meta 7</span>
            <span className="card-tag">{progress.evidenceCount} link(s) de evidência</span>
            <span className="card-tag">Encerramento: {dateBR(monitorUntil)}</span>
            {audit&&<span className="card-tag">OpenAI: {audit.score}/100 · confiança {audit.confidence==='high'?'alta':audit.confidence==='medium'?'média':'baixa'}</span>}
          </div>
          <div className="info-note mt-3">
            <strong>Orientação atual</strong>
            <p style={{marginTop:8}}>{audit?.recommendation||'Ainda não há uma auditoria da OpenAI. Aguarde a atualização do Grok ou clique em Reanalisar.'}</p>
            {audit?.blockers&&Array.isArray(audit.blockers)&&audit.blockers.length>0&&
              <p className="muted mt-2"><ShieldAlert size={14}/> Pendências: {audit.blockers.slice(0,3).join('; ')}</p>}
            <p className="mt-2"><b>Funil recomendado:</b> {decision?funnelLabels[decision.funnel]:'Aguardando avaliação'}
              {decision?.funnel_reason&&<span className="muted"> — {decision.funnel_reason}</span>}</p>
            {!progress.enoughForReview&&<p className="micro mt-2">Recomendação automática para teste só depois do período concluído, de pelo menos 7 datas de pesquisa e 2 links de evidência. Esses links ainda precisam de validação.</p>}
          </div>
          <div className="flex wrap gap-2 mt-3">
            <Link href={'/products/'+product.id} className="btn btn-primary"><BookOpenCheck size={15}/> Abrir dossiê</Link>
            <button className="btn" type="button" disabled={busyThis} onClick={()=>void auditNow(product)}><Sparkles size={15}/>{busyThis?'Aguarde...':'Reanalisar com OpenAI'}</button>
            {product.status==='researching'?<button className="btn" type="button" disabled={busyThis}
              onClick={()=>{if(confirm('Marcar como pronta para sua revisão? Isso não cria nem publica anúncios.'))void setStage(product,'ready');}}>
              <CheckCircle2 size={15}/> Marcar pronta para revisão</button>:
              product.status==='ready'?<button className="btn" type="button" disabled={busyThis}
                onClick={()=>void setStage(product,'researching')}>Observar mais</button>:null}
          </div>
          <details style={{marginTop:18}}>
            <summary style={{cursor:'pointer',fontWeight:650}}>Histórico do Grok ({history.length} atualizações)</summary>
            {timeline.length===0?<p className="muted mt-2">Nenhuma atualização do Grok registrada ainda.</p>:
              <div style={{display:'grid',gap:12,marginTop:12}}>
                {timeline.map((entry)=>{
                  const info=researchMonitor(entry);
                  return <article key={entry.id} style={{padding:12,border:'1px solid var(--border, #3a4e50)',borderRadius:10}}>
                    <strong>{dateBR(info?.observed_on||entry.created_at)}</strong>
                    <p style={{marginTop:6,whiteSpace:'pre-wrap'}}>{entry.summary}</p>
                    {!!info?.changes.length&&<ul style={{margin:'8px 0',paddingLeft:20}}>{info.changes.map((v,i)=><li key={i}>{v}</li>)}</ul>}
                    {!!info?.evidence_urls.length&&<div className="flex wrap gap-2 mt-2">{info.evidence_urls.map((url,i)=>{
                      const safe=safeHttpUrl(url);
                      return safe?<a key={i} href={safe} className="small-link" target="_blank" rel="noopener noreferrer">Fonte {i+1} <ExternalLink size={12}/></a>:null;
                    })}</div>}
                  </article>;
                })}
              </div>}
          </details>
        </section>;
      })}
    </div>}
    <p className="micro mt-3">A IA analisa o que está registrado no Caçador; ela não verifica automaticamente se cada link contém a prova alegada. Nenhum anúncio, checkout ou campanha é criado por esta área.</p>
  </>;
}
