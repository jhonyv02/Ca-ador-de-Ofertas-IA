'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpDown,BookOpenCheck,CheckCircle2,Clock3,ExternalLink,FileSearch,Filter,FolderSearch,Layers3,RefreshCw,Search,ShieldAlert,Smartphone, Sparkles} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {Feedback,Load,Modal,PageHeading} from '@/components/ui';
import type {Analysis,Product} from '@/lib/types';
import {isMiniApp} from '@/lib/mini-app-lane';
import {researchMonitor,researchDecision,researchProgress,funnelLabels} from '@/lib/research-pipeline';
import {safeHttpUrl} from '@/lib/utils';

type MiniView='all'|'researching'|'ready'|'other';
type DetailTab='overview'|'mvp'|'sources';
type MiniCase={
  product:Product;
  history:Analysis[];
  audit?:Analysis;
  miniData:Record<string,unknown>|null;
  monitorUntil:string;
  progress:ReturnType<typeof researchProgress>;
};
const mvpFields:[string,string][]=[
  ['problem','Problema que resolve'],
  ['frequency','Frequência do problema'],
  ['alternatives_br','Concorrentes no Brasil'],
  ['overseas_reference','Referência internacional'],
  ['mvp','Funções principais do MVP'],
  ['pricing_model','Monetização / preço sugerido'],
  ['build_estimate','Complexidade e tempo estimado'],
  ['operating_costs','Custos de operação'],
  ['acquisition','Como conseguir clientes'],
  ['risks','Riscos e dependências'],
  ['validation_plan','Plano de validação'],
];
function fmtDate(iso:string){
  if(!iso)return 'Não informado';
  const d=new Date(iso.includes('T')?iso:iso+'T12:00:00Z');
  return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('pt-BR',{timeZone:'UTC'});
}
function miniDataFrom(a:Analysis){
  const value=(a.breakdown as Record<string,unknown>|null)?.research_monitor;
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const mini=(value as Record<string,unknown>).mini_app;
  return mini&&typeof mini==='object'&&!Array.isArray(mini)?mini as Record<string,unknown>:null;
}
function stageLabel(p:Product){
  if(p.status==='ready')return 'Pronto para revisão';
  if(p.status==='researching')return 'Em observação';
  if(p.status==='testing')return 'Em teste';
  if(p.status==='winning')return 'Validado';
  return 'Descartado';
}
function verdictLabel(a?:Analysis){
  if(!a)return 'Sem auditoria';
  if(a.verdict==='approve')return 'Parecer favorável';
  if(a.verdict==='reject')return 'Não recomendado';
  return 'Precisa investigar';
}
function compact(value:string,limit=145){
  const text=value.trim();
  return text.length>limit?text.slice(0,limit).trimEnd()+'…':text;
}
function fieldValue(value:unknown){
  if(Array.isArray(value))return value.filter(x=>typeof x==='string').join('\n• ');
  return typeof value==='string'&&value.trim()?value:'Ainda não pesquisado';
}
export default function MiniAppRadar(){
  const {products,analyses,loading,error,supabase,refresh}=useWorkspace();
  const [search,setSearch]=useState('');
  const [stage,setStage]=useState<MiniView>('all');
  const [sort,setSort]=useState<'best'|'recent'>('best');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [tab,setTab]=useState<DetailTab>('overview');
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const [userId,setUserId]=useState('');
  const [endpoint,setEndpoint]=useState('/api/grok/mini-apps');
  useEffect(()=>{
    let live=true;
    setEndpoint(window.location.origin+'/api/grok/mini-apps');
    void supabase.auth.getUser().then(({data})=>{if(live)setUserId(data.user?.id||'');});
    return ()=>{live=false;};
  },[supabase]);

  const cases=useMemo<MiniCase[]>(()=>products.filter(isMiniApp).map(product=>{
    const history=analyses.filter(a=>a.product_id===product.id&&a.kind==='product'&&a.model==='Grok Monitor');
    const audit=analyses.find(a=>a.product_id===product.id&&a.kind==='openai_audit');
    const monitorUntil=history.map(researchMonitor).find(m=>m?.monitor_until)?.monitor_until||'';
    const miniData=history.map(miniDataFrom).find(Boolean)||null;
    return {product,history,audit,miniData,monitorUntil,progress:researchProgress(history,monitorUntil)};
  }),[products,analyses]);
  const shown=useMemo(()=>{
    const query=search.toLocaleLowerCase('pt-BR').trim();
    return cases.filter(c=>
      (stage==='all'||(stage==='other'? !['researching','ready'].includes(c.product.status):c.product.status===stage))&&
      (!query||[c.product.name,c.product.niche,c.product.promise,c.product.country,c.product.target_audience]
        .some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(query)))
    ).sort((a,b)=>sort==='best'
      ?Number(b.product.status==='ready')-Number(a.product.status==='ready')||
        Number(!!b.audit)-Number(!!a.audit)||
        (b.audit?.score||0)-(a.audit?.score||0)||
        b.product.updated_at.localeCompare(a.product.updated_at)
      :(b.history[0]?.created_at||b.product.updated_at).localeCompare(a.history[0]?.created_at||a.product.updated_at));
  },[cases,stage,sort,search]);
  const selected=cases.find(c=>c.product.id===selectedId);
  async function auditNow(product:Product){
    setBusy(product.id);setFailure('');setMessage('');
    try{
      const response=await fetch('/api/research/audit',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({product_id:product.id})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Falha na auditoria.');
      await refresh();
      setMessage('Auditoria atualizada. A nota representa avaliação de evidências, não probabilidade de venda.');
    }catch(e){setFailure(e instanceof Error?e.message:'Erro na auditoria.');}
    finally{setBusy('');}
  }
  async function changeStage(product:Product,status:'ready'|'researching'){
    if(status==='ready'&&!window.confirm('Marcar para revisão de MVP? Isso não desenvolve o aplicativo nem inicia anúncios.'))return;
    setBusy(product.id);setFailure('');setMessage('');
    try{
      const {error:changeError}=await supabase.from('products').update({status}).eq('id',product.id).eq('user_id',product.user_id);
      if(changeError)throw changeError;
      await refresh();
      setMessage(status==='ready'?'Enviado para sua revisão de MVP. Nenhum aplicativo foi desenvolvido.':'Devolvido para observação.');
    }catch(e){setFailure(e instanceof Error?e.message:'Não foi possível atualizar.');}
    finally{setBusy('');}
  }
  if(loading)return <Load/>;
  return <div className="mini-radar">
    <PageHeading eyebrow="MINI APPS · GROK + OPENAI" title="Radar de Mini Apps"
      description="Encontre as melhores oportunidades sem misturar pesquisa, auditoria e detalhes técnicos. Abra apenas o dossiê que quiser estudar."/>

    <div className="mini-radar-stats" aria-label="Resumo das oportunidades">
      <div className="mini-radar-stat"><span>Oportunidades</span><strong>{cases.length}</strong><Smartphone size={18}/></div>
      <div className="mini-radar-stat"><span>Em observação</span><strong>{cases.filter(c=>c.product.status==='researching').length}</strong><Clock3 size={18}/></div>
      <div className="mini-radar-stat"><span>Para revisão</span><strong>{cases.filter(c=>c.product.status==='ready').length}</strong><CheckCircle2 size={18}/></div>
      <div className="mini-radar-stat"><span>Com parecer OpenAI</span><strong>{cases.filter(c=>!!c.audit).length}</strong><Sparkles size={18}/></div>
    </div>

    <details className="mini-radar-help panel">
      <summary>Conexão do robô Grok <span>Ver configuração</span></summary>
      <p className="muted mt-2">A integração utiliza a chave privada GROK_WEBHOOK_SECRET no servidor. Nunca compartilhe a chave OpenAI nem o service_role do Supabase.</p>
      <p><strong>Endpoint:</strong> <code>{endpoint}</code></p>
      <p><strong>Seu user_id:</strong> <code>{userId||'Carregando...'}</code></p>
      <a className="small-link" href="https://github.com/jhonyv02/Ca-ador-de-Ofertas-IA/blob/main/GROK-MINI-APPS.md" target="_blank" rel="noopener noreferrer">Manual do robô <ExternalLink size={13}/></a>
    </details>

    <div className="mini-radar-tools">
      <label className="mini-radar-search">
        <Search size={18}/>
        <input type="search" aria-label="Pesquisar oportunidades" placeholder="Buscar por nome, nicho ou problema..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </label>
      <label className="mini-radar-select"><Filter size={16}/><select aria-label="Filtrar por etapa" value={stage} onChange={e=>setStage(e.target.value as MiniView)}>
        <option value="all">Todas as etapas</option><option value="researching">Em observação</option>
        <option value="ready">Para revisão</option><option value="other">Em teste ou concluídas</option>
      </select></label>
      <label className="mini-radar-select"><ArrowUpDown size={16}/><select aria-label="Ordenar oportunidades" value={sort} onChange={e=>setSort(e.target.value as 'best'|'recent')}>
        <option value="best">Maior nota primeiro</option><option value="recent">Mais recentes</option>
      </select></label>
      <button type="button" className="btn btn-ghost" onClick={()=>void refresh()}><RefreshCw size={16}/> Atualizar</button>
    </div>
    {error&&<Feedback type="error">{error}</Feedback>}
    {failure&&<Feedback type="error">{failure}</Feedback>}
    {message&&<Feedback type="success">{message}</Feedback>}
    <p className="mini-radar-result">{shown.length} de {cases.length} oportunidades · Notas são pareceres de IA, não previsão de vendas</p>

    {shown.length===0?<div className="panel mini-radar-empty"><FolderSearch size={30}/><h2>Nenhuma oportunidade encontrada</h2>
      <p className="muted">{cases.length?'Tente outro termo ou etapa.':'O próximo envio real do Grok aparecerá aqui automaticamente após o registro.'}</p>
    </div>:<div className="mini-radar-grid">
      {shown.map(c=><article key={c.product.id} className="mini-radar-card">
        <div className="mini-radar-card-top">
          <span className={'pill pill-'+c.product.status}>{stageLabel(c.product)}</span>
          <span className="mini-radar-score"><strong>{c.audit?Math.round(c.audit.score):'—'}</strong><small>/100</small></span>
        </div>
        <h2>{c.product.name}</h2>
        <p className="mini-radar-subtitle">{c.product.niche||'Nicho a investigar'} · {c.product.country||'Mercado não informado'}</p>
        <p className="mini-radar-promise">{c.product.promise||'Problema e proposta de valor ainda não cadastrados.'}</p>
        <div className="mini-radar-kpis">
          <div><strong>{c.progress.days}/7</strong><span>Dias pesquisados</span></div>
          <div><strong>{c.progress.evidenceCount}</strong><span>Links relatados</span></div>
          <div><strong>{c.audit?'Sim':'Não'}</strong><span>Auditoria</span></div>
        </div>
        <div className="mini-radar-next">
          <span>{verdictLabel(c.audit)}</span>
          <p>{compact(c.audit?.recommendation||'Aguardando parecer da OpenAI e validação das fontes.')}</p>
        </div>
        <div className="mini-radar-actions">
          <button type="button" className="btn btn-primary" onClick={()=>{setSelectedId(c.product.id);setTab('overview');}}><FileSearch size={15}/> Ver análise</button>
          <Link href={'/products/'+c.product.id} className="btn btn-ghost"><BookOpenCheck size={15}/> Dossiê</Link>
        </div>
      </article>)}
    </div>}

    <p className="mini-radar-warning"><ShieldAlert size={15}/> Os links são evidências relatadas pelo robô, não anúncios ou vendas confirmadas. Nenhum aplicativo ou campanha é publicado automaticamente.</p>

    {selected&&<Modal title={selected.product.name} subtitle={'Mini app · '+stageLabel(selected.product)} onClose={()=>setSelectedId(null)}>
      <div className="mini-radar-detail">
        <div className="mini-radar-modal-stats">
          <div><span>Nota OpenAI</span><strong>{selected.audit?selected.audit.score+'/100':'Sem análise'}</strong></div>
          <div><span>Período</span><strong>{selected.progress.days} de 7 dias</strong></div>
          <div><span>Fontes relatadas</span><strong>{selected.progress.evidenceCount} links</strong></div>
        </div>
        <div className="mini-radar-tabs" role="tablist" aria-label="Seções do dossiê">
          {([['overview','Resumo'],['mvp','MVP e custos'],['sources','Pesquisa Grok']] as const).map(([key,label])=>
            <button type="button" role="tab" aria-selected={tab===key} key={key}
              className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
        </div>
        {tab==='overview'&&<div className="mini-radar-body">
          <div className="mini-radar-info">
            <strong>{verdictLabel(selected.audit)}</strong>
            <p>{selected.audit?.recommendation||'Ainda não há parecer. Reanalise com OpenAI depois de registrar evidências.'}</p>
          </div>
          <h3>Proposta de valor</h3><p>{selected.product.promise||'Não informada.'}</p>
          {!!selected.audit?.blockers?.length&&<div className="mini-radar-blockers"><strong><ShieldAlert size={15}/> Pontos a investigar</strong>
            <ul>{selected.audit.blockers.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
          <h3>Funil sugerido</h3>
          <p>{funnelLabels[researchDecision(selected.audit)?.funnel||'undecided']}</p>
          {researchDecision(selected.audit)?.funnel_reason&&<p className="muted">{researchDecision(selected.audit)?.funnel_reason}</p>}
          <p className="micro">Fim do acompanhamento: {fmtDate(selected.monitorUntil)} · Aprovação automática só após 7 datas, 2 links e auditoria favorável. Os links ainda precisam ser verificados.</p>
        </div>}
        {tab==='mvp'&&<div className="mini-radar-body">
          <p className="muted">Plano preliminar informado pelo Grok, não orçamento técnico ou demanda comprovada.</p>
          {selected.miniData?<div className="mini-radar-fields">{mvpFields.map(([key,label])=>
            <section key={key}><h3>{label}</h3><p>{fieldValue(selected.miniData?.[key])}</p></section>)}</div>:
            <p>O robô ainda não enviou as informações estruturadas do mini app.</p>}
        </div>}
        {tab==='sources'&&<div className="mini-radar-body">
          <p className="muted">{selected.history.length} atualizações · {selected.progress.evidenceCount} links relatados. Abra um dia para conferir o relato original e as fontes.</p>
          {selected.history.length===0?<p>Nenhuma pesquisa enviada ainda.</p>:
            selected.history.slice(0,30).map(entry=>{
              const report=researchMonitor(entry);
              return <details key={entry.id} className="mini-radar-history">
                <summary><span>{fmtDate(report?.observed_on||entry.created_at)}</span><span>Ver atualização</span></summary>
                <p>{entry.summary}</p>
                {!!report?.changes.length&&<ul>{report.changes.map((change,i)=><li key={i}>{change}</li>)}</ul>}
                {!!report?.evidence_urls.length&&<div className="mini-radar-links">{report.evidence_urls.map((url,i)=>{
                  const safe=safeHttpUrl(url);
                  return safe?<a key={i} href={safe} target="_blank" rel="noopener noreferrer">Fonte {i+1} <ExternalLink size={12}/></a>:null;
                })}</div>}
              </details>;
            })}
        </div>}
        <div className="mini-radar-detail-actions">
          <button type="button" className="btn" disabled={busy===selected.product.id} onClick={()=>void auditNow(selected.product)}>
            <Sparkles size={15}/>{busy===selected.product.id?'Analisando...':'Reanalisar com OpenAI'}</button>
          {selected.product.status==='researching'?<button type="button" className="btn" disabled={busy===selected.product.id}
            onClick={()=>void changeStage(selected.product,'ready')}><CheckCircle2 size={15}/> Marcar para revisão</button>:
            selected.product.status==='ready'?<button type="button" className="btn" disabled={busy===selected.product.id}
              onClick={()=>void changeStage(selected.product,'researching')}>Observar mais</button>:null}
          <Link className="btn btn-primary" href={'/products/'+selected.product.id}><Layers3 size={15}/> Abrir dossiê completo</Link>
        </div>
      </div>
    </Modal>}
  </div>;
}
