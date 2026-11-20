'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BrainCircuit,ClipboardCheck,ExternalLink,LoaderCircle,ShieldAlert,Sparkles} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {PageHeading,Feedback,Load} from '@/components/ui';
import {isPrintableOffer} from '@/lib/printable-eligibility';
import {brl} from '@/lib/utils';
import {checkKeys,directCheckLabels,directFlags,directReadiness,notesWithFlag,
  type DirectCheck} from '@/lib/direct-traffic';

type Comparison={product_id:string;name:string;score:number;signal:'prepare'|'potential'|'reject';
  criticism:string;ready:boolean;blockers:string[]};
type WeeklyReport={
  decision:'launch_one'|'prepare_one'|'no_viable_offer';
  selected_product_id:string;selected_name:string;confidence:'low'|'medium'|'high';
  diagnosis:string;reason_to_choose:string;why_not_others:string[];weak_points:string[];
  next_actions:string[];creative_angle:string;seven_day_plan:string[];stop_rules:string[];
  comparison:Comparison[];ready:boolean;cpa_break_even:number|null;cpa_conservative:number|null;
};
type Saved={signature:string;report:WeeklyReport;generated_at:string;model:string;daily_budget_brl:number;budget_total_brl:number};
const labels={
  launch_one:'Uma oferta liberada para teste controlado',
  prepare_one:'Melhor hipótese para preparar — não anunciar ainda',
  no_viable_offer:'Nenhuma oferta liberada para anunciar',
};
const confidenceLabels={low:'baixa',medium:'média',high:'alta'};
type StoredDecision={
  id:string;decision:WeeklyReport['decision'];product_id:string|null;rationale:string;
  risks:string[]|null;payload:unknown;model:string;created_at:string;
};
function asStoredView(row:StoredDecision):Saved|null{
  if(!row.payload||typeof row.payload!=='object')return null;
  const payload=row.payload as Partial<Saved>&{report?:Partial<WeeklyReport>};
  const source=payload.report;
  if(!source||(source.decision!=='launch_one'&&source.decision!=='prepare_one'&&source.decision!=='no_viable_offer'))return null;
  const confidence=source.confidence==='high'||source.confidence==='medium'||source.confidence==='low'?source.confidence:'low';
  return {
    signature:'',
    generated_at:payload.generated_at||row.created_at,
    model:payload.model||row.model,
    daily_budget_brl:Number(payload.daily_budget_brl||0),
    budget_total_brl:Number(payload.budget_total_brl||0),
    report:{
      decision:source.decision,
      selected_product_id:source.selected_product_id||row.product_id||'',
      selected_name:source.selected_name||'',
      confidence,
      diagnosis:source.diagnosis||row.rationale||'',
      reason_to_choose:source.reason_to_choose||row.rationale||'',
      why_not_others:source.why_not_others||[],
      weak_points:source.weak_points||(Array.isArray(row.risks)?row.risks:[]),
      next_actions:source.next_actions||[],
      creative_angle:source.creative_angle||'',
      seven_day_plan:Array.isArray(source.seven_day_plan)?source.seven_day_plan:[],
      stop_rules:source.stop_rules||[],
      comparison:source.comparison||[],
      ready:!!source.ready,
      cpa_break_even:source.cpa_break_even??null,
      cpa_conservative:source.cpa_conservative??null,
    },
  };
}
function DecisionPanel({eyebrow,note,view,champion}:{
  eyebrow:string;note?:string;view:Saved;champion:{id:string;name:string}|null;
}){
  const report=view.report;
  return <section className="panel" style={{borderColor:'#3e806c'}}>
    <div className="flex between wrap center gap-2">
      <div><div className="eyebrow">{eyebrow}</div>
        <h2 style={{fontSize:21,marginBottom:8}}>{labels[report.decision]}</h2>
        <span className="micro">
          {new Date(view.generated_at).toLocaleString('pt-BR')} · Confiança {confidenceLabels[report.confidence]} · {view.model}
        </span>
      </div>
      <span className="pill">{report.ready?'Checklist completo':'Revisão pendente'}</span>
    </div>
    {note&&<p className="micro mt-2" style={{marginBottom:0}}>{note}</p>}
    {(champion||report.selected_name)&&<div style={{marginTop:16,padding:15,borderRadius:10,background:'#0e192b',border:'1px solid #2d4c61'}}>
      <div className="micro">OFERTA SELECIONADA</div>
      <h3 style={{fontSize:18,marginTop:6}}>{champion?.name||report.selected_name}</h3>
      <p style={{fontSize:13,margin:'8px 0 0'}}>{report.reason_to_choose}</p>
      {champion&&<><Link className="small-link mt-2" href={'/products/'+champion.id}>Abrir dossiê da oferta <ExternalLink size={14}/></Link><Link className="btn btn-primary mt-2" href={'/products/'+champion.id+'/remodelar'}><Sparkles size={15}/> Remodelar página de vendas</Link></>}
    </div>}
    <p style={{marginTop:15,fontSize:13}}>{report.diagnosis}</p>
    <div className="two-col">
      <section>
        <h3 style={{margin:'0 0 10px'}}>Pontos que impedem uma decisão segura</h3>
        {report.weak_points.length?
          <ul style={{fontSize:12,lineHeight:1.8,paddingLeft:19}}>{report.weak_points.map((p,i)=><li key={i}>{p}</li>)}</ul>
          :<p className="micro">Sem novos pontos relatados.</p>}
      </section>
      <section>
        <h3 style={{margin:'0 0 10px'}}>Por que as outras ficaram para trás</h3>
        <ul style={{fontSize:12,lineHeight:1.8,paddingLeft:19}}>{report.why_not_others.map((p,i)=><li key={i}>{p}</li>)}</ul>
      </section>
    </div>
    <div className="info-note mt-2">
      <strong>Mensagem central do criativo:</strong> {report.creative_angle}
      {report.cpa_break_even!==null&&<>
        <p style={{margin:'10px 0 0'}}>CPA máximo de equilíbrio informado pelas taxas cadastradas: <strong>{brl(report.cpa_break_even)}</strong>.
          Limite conservador de planejamento (70% da contribuição): <strong>{brl(report.cpa_conservative)}</strong>.
          Estes tetos só valem se todos os custos forem verdadeiros.</p>
      </>}
    </div>
    <h3 style={{margin:'20px 0 10px'}}>O que fazer antes de investir</h3>
    <ul style={{fontSize:12,lineHeight:1.8,paddingLeft:19}}>{report.next_actions.map((s,i)=><li key={i}>{s}</li>)}</ul>
    <h3 style={{margin:'20px 0 10px'}}>Roteiro de 7 dias: {brl(view.daily_budget_brl)} por dia · {brl(view.budget_total_brl)} no total</h3>
    <div className="card-grid">{report.seven_day_plan.map((task,i)=><div className="product-card" key={i}>
      <div className="micro">DIA {i+1}</div><p style={{fontSize:12,margin:0}}>{task}</p>
    </div>)}</div>
    <h3 style={{margin:'20px 0 10px'}}>Quando pausar ou revisar</h3>
    <ul style={{fontSize:12,lineHeight:1.8,paddingLeft:19}}>{report.stop_rules.map((s,i)=><li key={i}>{s}</li>)}</ul>
    {report.comparison.length>0&&<>
      <h3 style={{margin:'20px 0 10px'}}>Comparação feita pela IA</h3>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Oferta</th><th>Nota da hipótese</th><th>Decisão</th><th>Crítica</th></tr></thead>
        <tbody>{report.comparison.map(c=><tr key={c.product_id}>
          <td><Link href={'/products/'+c.product_id}>{c.name}</Link></td>
          <td>{c.score}/100</td>
          <td>{c.ready?'Checklist completo':c.signal==='reject'?'Rejeitar agora':'Preparar'}</td>
          <td style={{maxWidth:390,whiteSpace:'normal',lineHeight:1.6}}>{c.criticism}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="micro mt-2">A nota mede a avaliação crítica da hipótese, não a probabilidade de vender.</p>
    </>}
    <p className="micro mt-3" style={{marginBottom:0}}>
      Decisão assistida por IA, sem garantia de rentabilidade. Não publique conteúdo de terceiros sem
      licença e revisão técnica. Ao alterar produtos, anúncios, resultados ou orçamento, gere um novo parecer.
    </p>
  </section>;
}
export default function WeeklyDirect(){
  const {products,ads,testRuns,supabase,refresh,loading,error}=useWorkspace();
  const [budgetText,setBudgetText]=useState('35');
  const dailyBudget=Number(budgetText);
  const weeklyBudget=dailyBudget*7;
  const [busy,setBusy]=useState(false);
  const [report,setReport]=useState<Saved|null>(null);
  const [persisted,setPersisted]=useState<StoredDecision|null>(null);
  const [failure,setFailure]=useState('');
  const [userId,setUserId]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [updating,setUpdating]=useState<DirectCheck|null>(null);
  const ranked=useMemo(()=>products.filter(isPrintableOffer).map(product=>{
    const a=ads.filter(x=>x.product_id===product.id);
    const r=testRuns.filter(x=>x.product_id===product.id);
    return {product,gate:directReadiness(product,a,r),ads:a,runs:r};
  }).sort((a,b)=>Number(b.gate.ready)-Number(a.gate.ready)||b.gate.score-a.gate.score),
  [products,ads,testRuns]);
  useEffect(()=>{
    let alive=true;
    void supabase.auth.getUser().then(({data})=>{if(alive)setUserId(data.user?.id||'');});
    return ()=>{alive=false;};
  },[supabase]);
  useEffect(()=>{if(ranked.length&&!selectedId)setSelectedId(ranked[0].product.id);},[ranked,selectedId]);
  const signature=useMemo(()=>[
    String(dailyBudget),...products.map(p=>p.id+':'+p.updated_at).sort(),
    ...ads.map(a=>a.id+':'+a.updated_at).sort(),
    ...testRuns.map(t=>t.id+':'+t.spend+':'+t.sales+':'+t.revenue).sort()
  ].join('|'),[dailyBudget,products,ads,testRuns]);
  const cacheKey='cacador:weekly-direct:'+userId;
  useEffect(()=>{
    if(!userId||loading)return;
    try{
      const raw=window.localStorage.getItem(cacheKey);
      if(!raw){setReport(null);return;}
      const saved=JSON.parse(raw) as Saved;
      if(saved.signature===signature&&Date.now()-new Date(saved.generated_at).getTime()<48*60*60*1000)
        setReport(saved);
      else setReport(null);
    }catch{setReport(null);}
  },[cacheKey,signature,userId,loading]);
  useEffect(()=>{
    if(!userId)return;
    let alive=true;
    void supabase.from('weekly_decisions').select('id,decision,product_id,rationale,risks,payload,model,created_at')
      .eq('user_id',userId).order('created_at',{ascending:false}).limit(1).maybeSingle()
      .then(({data,error:loadError})=>{
        if(!alive)return;
        if(loadError||!data){setPersisted(null);return;}
        setPersisted(data as StoredDecision);
      });
    return ()=>{alive=false;};
  },[supabase,userId]);
  const selected=ranked.find(x=>x.product.id===selectedId)||ranked[0];
  const champion=report?.report.selected_product_id?
    products.find(p=>p.id===report.report.selected_product_id):null;
  const persistedView=persisted?asStoredView(persisted):null;
  const persistedChampion=persistedView?.report.selected_product_id?
    products.find(p=>p.id===persistedView.report.selected_product_id)||{
      id:persistedView.report.selected_product_id,name:persistedView.report.selected_name,
    }:null;
  async function analyze(){
    setFailure('');
    if(!Number.isFinite(dailyBudget)||dailyBudget<5||dailyBudget>5000){
      setFailure('Informe um orçamento diário entre R$ 5 e R$ 5.000.');return;
    }
    setBusy(true);
    try{
      const res=await fetch('/api/weekly-direct',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({dailyBudget})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'A IA não conseguiu analisar as ofertas.');
      const saved:Saved={report:data.report,generated_at:data.generated_at,
        daily_budget_brl:data.daily_budget_brl,
        budget_total_brl:data.budget_total_brl,model:data.model,signature};
      setReport(saved);
      if(data.report.selected_product_id)setSelectedId(data.report.selected_product_id);
      if(userId)try{window.localStorage.setItem(cacheKey,JSON.stringify(saved));}catch{}
    }catch(err){setFailure(err instanceof Error?err.message:'Erro de conexão com a IA.');}
    finally{setBusy(false);}
  }
  async function toggleCheck(key:DirectCheck,checked:boolean){
    if(!selected||updating)return;
    setUpdating(key);setFailure('');
    const product=selected.product;
    const nextNotes=notesWithFlag(product.notes,key,checked);
    try{
      const {error:saveError}=await supabase.from('products')
        .update({notes:nextNotes}).eq('id',product.id).eq('user_id',product.user_id);
      if(saveError)throw saveError;
      await refresh();
      setReport(null);
      if(userId)try{window.localStorage.removeItem(cacheKey);}catch{}
    }catch(err){setFailure('Não foi possível salvar a conferência: '+
      (err instanceof Error?err.message:'falha de conexão'));}
    finally{setUpdating(null);}
  }
  return <>
    <PageHeading eyebrow="DECISÃO SEMANAL · META ADS" title="Qual oferta testar esta semana?"
      description="Análise crítica para tráfego direto: uma oferta, página própria e compra no checkout. Sem confundir pesquisa com vendas."/>
    {error&&<div className="mb-2"><Feedback type="error">Não foi possível consultar o painel: {error}</Feedback></div>}
    <section className="panel">
      <div className="flex between wrap center gap-3">
        <div>
          <div className="eyebrow" style={{marginBottom:8}}>RADAR CRÍTICO PARA TRÁFEGO DIRETO</div>
          <h2 style={{fontSize:20,marginBottom:8}}>A IA pode dizer “não anuncie ainda”</h2>
          <p className="muted" style={{maxWidth:680,margin:0,fontSize:12}}>
            Ela compara promessa, nicho, preço, margem, concorrência documentada, facilidade de vender
            sem conversa no WhatsApp, funil, riscos e histórico real de testes.
            Nenhum retorno de anúncios de terceiros é inventado.
          </p>
        </div>
        <div style={{minWidth:180}}>
          <label className="field" htmlFor="weekly-budget">Orçamento diário (R$)</label>
          <input id="weekly-budget" className="input" type="number" min={5} max={5000} step={1}
            value={budgetText} onChange={e=>setBudgetText(e.target.value)}/>
          <p className="micro" style={{margin:'5px 0 0'}}>Valor inicial: R$ 35 por dia, ajustável.</p>
          <p className="micro" style={{margin:'7px 0 0'}}>
            Total previsto para 7 dias: <strong>{Number.isFinite(weeklyBudget)&&weeklyBudget>0?brl(weeklyBudget):'—'}</strong>
          </p>
        </div>
      </div>
      <div className="flex between wrap center gap-2 mt-3">
        <span className="micro">{products.length} ofertas no painel · {ranked.filter(r=>r.gate.ready).length} com checklist completo</span>
        <button className="btn btn-primary" onClick={()=>void analyze()} disabled={busy||loading||!products.length}>
          {busy?<LoaderCircle size={17} className="spin"/>:<BrainCircuit size={17}/>}
          {busy?'IA avaliando riscos e margens...':'Análise crítica com IA'}
        </button>
      </div>
      {failure&&<div className="mt-2"><Feedback type="error">{failure}</Feedback></div>}
      <p className="micro mt-2" style={{marginBottom:0}}>
        A IA consulta seus registros no Supabase. Ela não abre links externos nem tem acesso aos resultados
        privados dos concorrentes. Custo da API conforme seu provedor/modelo configurado.
      </p>
    </section>
    {loading?<Load/>:products.length===0?<section className="panel">
      <p>Primeiro cadastre uma oferta com nome e link. Depois volte para comparar as opções.</p>
      <Link href="/products" className="btn btn-primary">Ir para Produtos <ArrowRight size={15}/></Link>
    </section>:<>
      {persistedView&&<DecisionPanel eyebrow="ÚLTIMA DECISÃO GRAVADA" note="Esta decisão ficou salva no servidor. Se ela manda lançar ou preparar uma oferta, essa oferta vira a escolha da semana. O botão abaixo continua gerando um parecer só neste navegador." view={persistedView} champion={persistedChampion}/>}
      {persisted&&!persistedView&&<section className="panel" style={{borderColor:'#3e806c'}}>
        <div className="eyebrow">ÚLTIMA DECISÃO GRAVADA</div>
        <h2 style={{fontSize:21}}>{labels[persisted.decision]}</h2>
        <p style={{fontSize:13}}>{persisted.rationale}</p>
        {Array.isArray(persisted.risks)&&persisted.risks.length>0&&<ul style={{fontSize:12,lineHeight:1.8,paddingLeft:19}}>{persisted.risks.map((item,index)=><li key={index}>{item}</li>)}</ul>}
      </section>}
      {report?<DecisionPanel eyebrow="PARECER CRÍTICO DA IA" view={report} champion={champion?{id:champion.id,name:champion.name}:null}/>:!persisted&&<section className="panel">
        <div className="flex center gap-2"><ShieldAlert size={19}/>
          <h2>Não há recomendação de IA atual</h2></div>
        <p className="muted mt-2" style={{fontSize:12}}>
          Clique em “Análise crítica com IA” para comparar as ofertas cadastradas.
          O quadro abaixo é só uma triagem de evidências, não substitui essa análise.
        </p>
      </section>}

      <section className="panel">
        <div className="flex between center wrap gap-2">
          <div><h2>Filtro de prontidão — antes de subir tráfego</h2>
            <p className="muted" style={{fontSize:12,margin:'6px 0 0'}}>
              Para marcar, confira de verdade. Os itens ficam gravados no cadastro do produto.
            </p>
          </div>
          <select className="input" style={{width:'min(100%,380px)'}} value={selected?.product.id||''}
            onChange={e=>setSelectedId(e.target.value)}>
            {ranked.map(x=><option value={x.product.id} key={x.product.id}>{x.product.name}</option>)}
          </select>
        </div>
        {selected&&<>
          <div className="flex between wrap gap-2 center mt-3">
            <div><h3 style={{fontSize:16}}>{selected.product.name}</h3>
              <span className="micro">Índice de evidências {selected.gate.score}/100 — não representa chance de lucro</span></div>
            <span className={'pill '+(selected.gate.ready?'pill-ready':'pill-researching')}>
              {selected.gate.ready?'Checklist completo':'Ainda não subir anúncios'}
            </span>
          </div>
          <div className="advanced-grid" style={{padding:'16px 0 0'}}>
            {checkKeys.map(k=><label key={k} className="field"
              style={{flexDirection:'row',alignItems:'center',gap:9,background:'#0c1626',
                padding:12,borderRadius:10,cursor:'pointer'}}>
              <input type="checkbox" checked={directFlags(selected.product)[k]}
                disabled={updating!==null} onChange={e=>void toggleCheck(k,e.target.checked)}/>
              <span style={{fontSize:12}}>{directCheckLabels[k]}</span>
            </label>)}
          </div>
          <div className="info-note mt-2">
            <strong>Bloqueios encontrados:</strong>{' '}
            {selected.gate.blockers.length?selected.gate.blockers.join(' · '):
              'Nenhum bloqueio documental neste checklist. Ainda valide conformidade, rastreamento de compras e entrega.'}
          </div>
          {selected.gate.cautiousCpa!==null&&<p className="mt-2" style={{fontSize:12}}>
            Com os custos cadastrados, CPA de equilíbrio: <strong>{brl(selected.gate.breakEvenCpa)}</strong>.
            Teto mais conservador (70%): <strong>{brl(selected.gate.cautiousCpa)}</strong>.
          </p>}
          <Link href={'/products/'+selected.product.id} className="btn btn-ghost mt-2">Editar preço, custos e checkout <ArrowRight size={14}/></Link><Link href={"/products/"+selected.product.id+"/remodelar"} className="btn btn-primary mt-2"><Sparkles size={14}/> Remodelar página de vendas</Link>
        </>}
      </section>
      <section className="panel">
        <div className="flex center gap-2"><ClipboardCheck size={19}/><h2>Triagem de ofertas salvas</h2></div>
        <div className="table-wrap mt-2"><table className="data-table">
          <thead><tr><th>Oferta</th><th>Mercado</th><th>Preço</th><th>Evidências</th><th>Status</th></tr></thead>
          <tbody>{ranked.map(({product,gate})=><tr key={product.id}>
            <td><Link href={'/products/'+product.id}>{product.name}</Link>{product.weekly_pick&&<> <span className="pill pill-week">Escolha da semana</span></>}</td>
            <td>{product.country} · {product.currency}</td>
            <td>{product.sale_price===null?'Não confirmado':brl(product.sale_price,product.currency)}</td>
            <td>{gate.score}/100</td>
            <td><span className={'pill '+(gate.ready?'pill-ready':'pill-researching')}>
              {gate.ready?'Pode avaliar teste':'Revisar antes'}</span></td>
          </tr>)}</tbody>
        </table></div>
        <p className="micro mt-2">A triagem não atesta a veracidade dos preços e métricas. Condições e concorrência mudam.</p>
      </section>
    </>}
  </>;
}
