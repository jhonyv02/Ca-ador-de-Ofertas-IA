'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CirclePlus, Edit, ExternalLink, Flame, ImagePlus, Plus, Trash2, Wallet, FileText, Clock3, BarChart3, Sparkles } from 'lucide-react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { AdForm, ProductForm } from '@/components/forms';
import { AnalysisReport, AnalyzeButton } from '@/components/analyze';
import { AdInspector } from '@/components/ad-inspector';
import { Creative } from '@/components/creative';
import { PageHeading, Section, Modal, Empty, Load, StatusPill, ScoreRing, Feedback } from '@/components/ui';
import { opportunityScore, brl, shortDate, safeHttpUrl } from '@/lib/utils';
import { chatOffers, metaSearchLinks } from '@/lib/chatgpt-offers';
import { isResearchBreakdown, offerFacts } from '@/lib/digital-radar';
import { dbErrorMessage } from '@/lib/db-error';
import { creativeStoragePaths, distinctAdvertisers, offerLibraryUrl } from '@/lib/library-links';
import { LinkifiedText } from '@/components/linkified-text';
import {repairMetaLibraryLink,metaSearchUrlForWebsite} from '@/lib/meta-search';
export default function ProductDetail(){
  const {id}=useParams<{id:string}>();const router=useRouter();const {products,ads,analyses,loading,supabase,refresh,latestAnalysis,testRuns}=useWorkspace();
  const [edit,setEdit]=useState(false);const [addAd,setAddAd]=useState(false);const [inspect,setInspect]=useState<Ad|null>(null);const [error,setError]=useState('');
  const product=products.find(p=>p.id===id);
  const [capturePreview,setCapturePreview]=useState('');
  useEffect(()=>{
    const paths=[...((product?.notes||'').matchAll(/Print privado \(Supabase creatives\): ([^\r\n]+)/g))];
    const last=paths.length?paths[paths.length-1][1]:null;
    let alive=true;
    if(!last){setCapturePreview('');return;}
    void supabase.storage.from('creatives').createSignedUrl(last.trim(),900)
      .then(({data,error})=>{if(alive)setCapturePreview(!error?(data?.signedUrl||''):'');});
    return ()=>{alive=false;};
  },[product?.notes,supabase]);const curated=product?chatOffers.find(o=>product.notes?.includes('#chatgpt:'+o.key)||product.notes?.includes('#pesquisa-meta-v2:'+o.key)||o.name===product.name):undefined;const productAds=ads.filter(a=>a.product_id===id);const scoreAnalysis=latestAnalysis(id);const score=product?opportunityScore(product,productAds,scoreAnalysis):null;const audit=analyses.find(a=>a.product_id===id&&a.kind==='openai_audit');const research=analyses.find(a=>a.product_id===id&&a.kind==='product'&&(a.model==='Grok Bot'||isResearchBreakdown(a.breakdown)));const manual=analyses.find(a=>a.product_id===id&&a.kind==='product'&&a.model!=='Grok Bot'&&!isResearchBreakdown(a.breakdown));
  if(loading)return <Load/>;
  if(!product)return <><PageHeading title="Produto não encontrado" description="Esse produto pode ter sido excluído ou você não tem acesso a ele."/><Link href="/products" className="btn">Voltar à lista</Link></>;
  const facts=offerFacts(product,research??manual??scoreAnalysis);
  const libraryUrl=offerLibraryUrl(product,productAds);
  const advertisers=distinctAdvertisers(productAds);
  const domainMetaSearch=metaSearchUrlForWebsite(product.landing_url);
  const costsKnown=product.fulfillment_cost!==null&&product.extra_cost!==null;
  const contribution=product.sale_price!==null&&costsKnown?product.sale_price-product.fulfillment_cost!-product.extra_cost!:null;
  async function remove(){if(!confirm(`Excluir ${product?.name} e TODOS os seus anúncios e análises?`))return;const paths=[...new Set(productAds.flatMap(creativeStoragePaths))];const {error}=await supabase.from('products').delete().eq('id',id);if(error){setError(error.message);return;}if(paths.length)await supabase.storage.from('creatives').remove(paths);await refresh();router.push('/products');}
  async function toggleWeeklyPick(){
    if(!product)return;
    const {error:saveError}=await supabase.from('products').update({weekly_pick:!product.weekly_pick}).eq('id',product.id);
    if(saveError){setError(dbErrorMessage(saveError,'Não foi possível marcar a escolha da semana'));return;}
    setError('');
    await refresh();
  }
  return <>
  <div className="flex gap-2 center mb-2"><Link href="/products" className="small-link"><ArrowLeft size={15}/> Todos os produtos</Link></div>
  <PageHeading eyebrow="DOSSIÊ DA OFERTA" title={product.name} description={product.niche||'Produto em pesquisa'} action={<><button className="btn" onClick={()=>void toggleWeeklyPick()}>{product.weekly_pick?'Remover escolha da semana':'Marcar escolha da semana'}</button><Link className="btn btn-primary" href={"/products/"+id+"/remodelar"}><Sparkles size={16}/> Criar página com IA + mockups</Link><button className="btn" onClick={()=>setEdit(true)}><Edit size={16}/> Editar</button><button className="btn btn-danger" onClick={remove}><Trash2 size={16}/> Excluir</button></>}/>
  {error&&<div className="mb-2"><Feedback type="error">{error}</Feedback></div>}
  <div className="detail-meta"><StatusPill value={product.status}/>{product.weekly_pick&&<span className="pill pill-week">Escolha da semana</span>}<span className="card-tag">{product.product_type}</span><span className="card-tag">{facts.formatLabel}</span><span className="card-tag">Facilidade: {facts.effort}</span><span className="card-tag">{product.country}</span><span className="card-tag">Criado em {shortDate(product.created_at)}</span></div>
  <div className="stats-grid"><div className="stat"><div><div className="stat-label">Anúncios coletados</div><div className="stat-value">{productAds.length}</div><div className="stat-note">Evidências documentadas</div></div><div className="stat-icon"><ImagePlus size={20}/></div></div><div className="stat"><div><div className="stat-label">Preço de venda</div><div className="stat-value" style={{fontSize:22}}>{product.sale_price===null?'—':brl(product.sale_price,product.currency)}</div><div className="stat-note">Valor informado por você</div></div><div className="stat-icon"><Wallet size={20}/></div></div><div className="stat"><div><div className="stat-label">Teto de CPA estimado</div><div className="stat-value" style={{fontSize:22}}>{contribution===null?'—':brl(Math.max(0,contribution),product.currency)}</div><div className="stat-note">{contribution===null?"Informe os custos para calcular":"Preço - custos, antes de outros fixos"}</div></div><div className="stat-icon"><Flame size={20}/></div></div><div className="stat"><div><div className="stat-label">{audit?'Score da auditoria':'Score da pesquisa'}</div><div className="stat-value">{score?.score||0}<small>/100</small></div><div className="stat-note">{score?.confidence}</div></div><ScoreRing value={score?.score||0} size="sm"/></div></div>
  <div className="two-col"><div>
    <Section title="Diagnóstico da oferta" description="A pesquisa do assistente e a auditoria OpenAI aparecem separadas. O botão continua gerando a análise da sua sessão." action={<AnalyzeButton productId={id}/>}>{audit&&<div className="mb-2"><AnalysisReport analysis={audit}/></div>}{manual&&<div className="mb-2"><AnalysisReport analysis={manual}/></div>}{research&&<div className="mb-2"><AnalysisReport analysis={research}/></div>}{!audit&&!manual&&!research&&<div className="info-note">Ainda não existe relatório. Cadastre a promessa, preço, público e alguns anúncios; depois clique em "Analisar produto com IA". Sem a chave OPENAI_API_KEY, você continua com o score heurístico acima.</div>}{!audit&&!manual&&!research&&score?.parts&&<div className="mt-3">{score.parts.map(part=><div className="breakdown-item" key={part.label}><div className="breakdown-label"><span>{part.label}</span><span>{part.points}/{part.max}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${100*part.points/part.max}%`}}/></div></div>)}</div>}</Section>
    <Section title="Anúncios deste produto" description={`${productAds.length} criativo(s) cadastrados`} action={<button className="btn btn-primary" onClick={()=>setAddAd(true)}><Plus size={15}/> Adicionar anúncio</button>}>
      {productAds.length===0?<Empty icon={<ImagePlus size={25}/>} headline="Ainda sem anúncios" description="Registre prints, vídeos, copies e links dos seus concorrentes." action={<button className="btn" onClick={()=>setAddAd(true)}>Salvar primeiro anúncio</button>}/>:<div className="card-grid">{productAds.map(ad=><div className="ad-card" key={ad.id}><Creative ad={ad}/><div className="flex between center gap-2"><span className="card-tag">{ad.platform.toUpperCase()}</span><StatusPill value={ad.observed_active}/></div><h3>{ad.name}</h3><p>{ad.hook||ad.ad_copy.slice(0,100)||'Copy não cadastrada'}</p><div className="flex wrap gap-2"><button className="btn btn-primary" onClick={()=>setInspect(ad)}>Ver análise <ArrowUpRight size={15}/></button>{safeHttpUrl(ad.ad_url)&&<a className="btn" href={ad.platform==='meta'?repairMetaLibraryLink(ad.ad_url):safeHttpUrl(ad.ad_url)} target="_blank" rel="noopener noreferrer">Ver na Biblioteca <ExternalLink size={14}/></a>}</div></div>)}</div>}
    </Section>
  </div><div>
    <Section title="Resumo da oferta" description="Dados que serão usados para análise."><div className="kv"><div className="kv-item"><span>Público-alvo</span><strong>{product.target_audience||'Não informado'}</strong></div><div className="kv-item"><span>Nicho</span><strong>{product.niche||'Não informado'}</strong></div><div className="kv-item"><span>Custos por venda</span><strong>{brl((product.fulfillment_cost||0)+(product.extra_cost||0),product.currency)}</strong></div><div className="kv-item"><span>Mercado</span><strong>{product.country} · {product.language}</strong></div></div>
      {product.promise&&<div className="mt-3"><div className="micro">PROMESSA</div><p className="mt-2 notes-text">{product.promise}</p></div>}
      {product.notes&&<div className="mt-3"><div className="micro">ANOTAÇÕES</div><p className="mt-2 notes-text"><LinkifiedText text={product.notes}/></p></div>}
      {(product.landing_url||libraryUrl)&&<div className="mt-3 stack-actions">{product.landing_url&&<a className="btn" href={product.landing_url} target="_blank" rel="noopener noreferrer">Abrir página de vendas <ExternalLink size={15}/></a>}{libraryUrl&&<a className="btn btn-primary" href={libraryUrl} target="_blank" rel="noopener noreferrer">Biblioteca de anúncios do concorrente <ExternalLink size={15}/></a>}{domainMetaSearch&&<a className="btn" href={domainMetaSearch} target="_blank" rel="noopener noreferrer">Pesquisar domínio (alternativa) <ExternalLink size={15}/></a>}</div>}
    </Section>
    <Section title="Biblioteca de anúncios" description="Cada anunciante distinto e o link da página dele na Biblioteca da Meta.">
      {advertisers.length===0?<p className="muted" style={{fontSize:12}}>Nenhum anunciante cadastrado. Salve os anúncios do concorrente para abrir a biblioteca de cada um.</p>:<ul className="library-list">{advertisers.map(item=><li className="library-row" key={item.key}><div><strong>{item.name}</strong><span className="micro">{item.count===1?'1 anúncio':item.count+' anúncios'}</span></div>{item.url?<a className="btn" href={item.url} target="_blank" rel="noopener noreferrer">Abrir biblioteca <ExternalLink size={14}/></a>:<span className="micro">Sem link da biblioteca</span>}</li>)}</ul>}
    </Section>
    {curated&&<Section title="Pesquisa na Meta e links da oferta" description="Os botões abaixo abrem PESQUISAS na Biblioteca da Meta; nenhum anúncio individual foi confirmado automaticamente.">
      <div className="info-note"><strong>Status: anúncios ainda não verificados.</strong> Para comprovar atividade, encontre o ID do anúncio individual e salve o criativo na aba de anúncios.</div>
      <div className="flex wrap gap-2 mt-3">
        {curated.url&&<a className="btn btn-primary" href={curated.url} target="_blank" rel="noopener noreferrer">Página de vendas <ExternalLink size={14}/></a>}
        {curated.marketplace&&<a className="btn" href={curated.marketplace} target="_blank" rel="noopener noreferrer">Oferta / Hotmart <ExternalLink size={14}/></a>}
        {curated.checkout&&<a className="btn" href={curated.checkout} target="_blank" rel="noopener noreferrer">Checkout <ExternalLink size={14}/></a>}
      </div>
      <div className="mt-3"><div className="micro">TRÊS PESQUISAS PRONTAS NA BIBLIOTECA DA META</div>
        <div className="flex wrap gap-2 mt-2">{metaSearchLinks(curated).map(link=><a key={link.url} className="btn" target="_blank" rel="noopener noreferrer" href={link.url}>Meta: {link.label} <ExternalLink size={14}/></a>)}</div>
      </div>
      <div className="mt-3" style={{fontSize:12}}>
        <p><strong>Vendedor/marca:</strong> {curated.advertiser||'Não identificado'}</p>
        <p><strong>Prioridade editorial:</strong> {curated.priority} (não indica vendas comprovadas)</p>
        <p><strong>Risco a checar:</strong> {curated.risk||'Validar mercado, produto e CPA'}</p>
      </div>
    </Section>}
    {capturePreview&&<Section title="Print capturado no navegador" description="Registro da página concorrente na data da captura; não é prova de resultados de vendas.">
      <a href={capturePreview} target="_blank" rel="noopener noreferrer" className="small-link">
        Abrir imagem completa <ExternalLink size={14}/></a>
      <a href={capturePreview} target="_blank" rel="noopener noreferrer">
        <img src={capturePreview} alt="Captura privada da página de referência"
          style={{width:'100%',maxHeight:360,objectFit:'contain',marginTop:12,
            background:'#0d1b25',borderRadius:8,border:'1px solid #334155'}}/>
      </a>
    </Section>}
    <Section title="Evolução de testes" description="Resultados reais preenchidos por você.">{testRuns.filter(t=>t.product_id===id).length===0?<p className="muted" style={{fontSize:12}}>Nenhum teste registrado. Use o simulador para registrar orçamento e resultados.</p>:testRuns.filter(t=>t.product_id===id).map(t=><div className="watchlist-row" key={t.id}><span>{shortDate(t.start_date)} · {t.sales} vendas</span><strong>{brl(t.revenue-t.spend,product.currency)}*</strong></div>)}<Link href={`/simulator?product=${id}`} className="btn wide mt-2"><BarChart3 size={16}/> Simular e registrar testes</Link><p className="micro mt-2">* Receita menos gasto com anúncio, sem descontar outros custos.</p></Section>
  </div></div>
  {edit&&<Modal title="Editar produto" onClose={()=>setEdit(false)}><ProductForm product={product} onCancel={()=>setEdit(false)} onComplete={()=>setEdit(false)}/></Modal>}
  {addAd&&<Modal title="Adicionar anúncio" subtitle={`Produto: ${product.name}`} onClose={()=>setAddAd(false)}><AdForm productId={id} onComplete={()=>setAddAd(false)} onCancel={()=>setAddAd(false)}/></Modal>}
  {inspect&&<AdInspector ad={ads.find(a=>a.id===inspect.id)||inspect} onClose={()=>setInspect(null)}/>}
  </>;
}
