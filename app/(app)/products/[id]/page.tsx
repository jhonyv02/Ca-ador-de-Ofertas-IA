'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, CirclePlus, Edit, ExternalLink, Flame, ImagePlus, Plus, Trash2, Wallet, FileText, Clock3, BarChart3 } from 'lucide-react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { AdForm, ProductForm } from '@/components/forms';
import { AnalysisReport, AnalyzeButton } from '@/components/analyze';
import { AdInspector } from '@/components/ad-inspector';
import { Creative } from '@/components/creative';
import { PageHeading, Section, Modal, Empty, Load, StatusPill, ScoreRing, Feedback } from '@/components/ui';
import { opportunityScore, brl, shortDate, adDays } from '@/lib/utils';
export default function ProductDetail(){
  const {id}=useParams<{id:string}>();const router=useRouter();const {products,ads,loading,supabase,refresh,latestAnalysis,testRuns}=useWorkspace();
  const [edit,setEdit]=useState(false);const [addAd,setAddAd]=useState(false);const [inspect,setInspect]=useState<Ad|null>(null);const [error,setError]=useState('');
  const product=products.find(p=>p.id===id);const productAds=ads.filter(a=>a.product_id===id);const analysis=latestAnalysis(id);const score=product?opportunityScore(product,productAds,analysis):null;
  if(loading)return <Load/>;
  if(!product)return <><PageHeading title="Produto não encontrado" description="Esse produto pode ter sido excluído ou você não tem acesso a ele."/><Link href="/products" className="btn">Voltar à lista</Link></>;
  const contribution=(product.sale_price||0)-(product.fulfillment_cost||0)-(product.extra_cost||0);
  async function remove(){if(!confirm(`Excluir ${product?.name} e TODOS os seus anúncios e análises?`))return;const paths=productAds.map(a=>a.creative_path).filter((x):x is string=>!!x);const {error}=await supabase.from('products').delete().eq('id',id);if(error){setError(error.message);return;}if(paths.length)await supabase.storage.from('creatives').remove(paths);await refresh();router.push('/products');}
  return <>
  <div className="flex gap-2 center mb-2"><Link href="/products" className="small-link"><ArrowLeft size={15}/> Todos os produtos</Link></div>
  <PageHeading eyebrow="DOSSIÊ DA OFERTA" title={product.name} description={product.niche||'Produto em pesquisa'} action={<><button className="btn" onClick={()=>setEdit(true)}><Edit size={16}/> Editar</button><button className="btn btn-danger" onClick={remove}><Trash2 size={16}/> Excluir</button></>}/>
  {error&&<div className="mb-2"><Feedback type="error">{error}</Feedback></div>}
  <div className="detail-meta"><StatusPill value={product.status}/><span className="card-tag">{product.product_type}</span><span className="card-tag">{product.country}</span><span className="card-tag">Criado em {shortDate(product.created_at)}</span></div>
  <div className="stats-grid"><div className="stat"><div><div className="stat-label">Anúncios coletados</div><div className="stat-value">{productAds.length}</div><div className="stat-note">Evidências documentadas</div></div><div className="stat-icon"><ImagePlus size={20}/></div></div><div className="stat"><div><div className="stat-label">Preço de venda</div><div className="stat-value" style={{fontSize:22}}>{product.sale_price===null?'—':brl(product.sale_price,product.currency)}</div><div className="stat-note">Valor informado por você</div></div><div className="stat-icon"><Wallet size={20}/></div></div><div className="stat"><div><div className="stat-label">Teto de CPA estimado</div><div className="stat-value" style={{fontSize:22}}>{product.sale_price===null?'—':brl(Math.max(0,contribution),product.currency)}</div><div className="stat-note">Preço - custos, antes de outros fixos</div></div><div className="stat-icon"><Flame size={20}/></div></div><div className="stat"><div><div className="stat-label">Score da pesquisa</div><div className="stat-value">{score?.score||0}<small>/100</small></div><div className="stat-note">{score?.confidence}</div></div><ScoreRing value={score?.score||0} size="sm"/></div></div>
  <div className="two-col"><div>
    <Section title="Diagnóstico da oferta" description="A IA considera os dados preenchidos e as copies, não navega nos links por conta própria." action={<AnalyzeButton productId={id}/>}>{analysis?<AnalysisReport analysis={analysis}/>:<div className="info-note">Ainda não existe relatório. Cadastre a promessa, preço, público e alguns anúncios; depois clique em "Analisar produto com IA". Sem a chave OPENAI_API_KEY, você continua com o score heurístico acima.</div>}{!analysis&&score?.parts&&<div className="mt-3">{score.parts.map(part=><div className="breakdown-item" key={part.label}><div className="breakdown-label"><span>{part.label}</span><span>{part.points}/{part.max}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${100*part.points/part.max}%`}}/></div></div>)}</div>}</Section>
    <Section title="Anúncios deste produto" description={`${productAds.length} criativo(s) cadastrados`} action={<button className="btn btn-primary" onClick={()=>setAddAd(true)}><Plus size={15}/> Adicionar anúncio</button>}>
      {productAds.length===0?<Empty icon={<ImagePlus size={25}/>} headline="Ainda sem anúncios" description="Registre prints, vídeos, copies e links dos seus concorrentes." action={<button className="btn" onClick={()=>setAddAd(true)}>Salvar primeiro anúncio</button>}/>:<div className="card-grid">{productAds.map(ad=><div className="ad-card" key={ad.id}><Creative ad={ad}/><div className="flex between center gap-2"><span className="card-tag">{ad.platform.toUpperCase()}</span><StatusPill value={ad.observed_active}/></div><h3>{ad.name}</h3><p>{ad.hook||ad.ad_copy.slice(0,100)||'Copy não cadastrada'}</p><button className="btn btn-primary" onClick={()=>setInspect(ad)}>Ver análise <ArrowUpRight size={15}/></button></div>)}</div>}
    </Section>
  </div><div>
    <Section title="Resumo da oferta" description="Dados que serão usados para análise."><div className="kv"><div className="kv-item"><span>Público-alvo</span><strong>{product.target_audience||'Não informado'}</strong></div><div className="kv-item"><span>Nicho</span><strong>{product.niche||'Não informado'}</strong></div><div className="kv-item"><span>Custos por venda</span><strong>{brl((product.fulfillment_cost||0)+(product.extra_cost||0),product.currency)}</strong></div><div className="kv-item"><span>Mercado</span><strong>{product.country} · {product.language}</strong></div></div>
      {product.promise&&<div className="mt-3"><div className="micro">PROMESSA</div><p className="mt-2" style={{whiteSpace:'pre-wrap',fontSize:12}}>{product.promise}</p></div>}
      {product.notes&&<div className="mt-3"><div className="micro">ANOTAÇÕES</div><p className="mt-2" style={{whiteSpace:'pre-wrap',fontSize:12}}>{product.notes}</p></div>}
      {product.landing_url&&<div className="mt-3"><a className="btn wide" href={product.landing_url} target="_blank" rel="noopener noreferrer">Abrir página de vendas <ExternalLink size={15}/></a></div>}
    </Section>
    <Section title="Evolução de testes" description="Resultados reais preenchidos por você.">{testRuns.filter(t=>t.product_id===id).length===0?<p className="muted" style={{fontSize:12}}>Nenhum teste registrado. Use o simulador para registrar orçamento e resultados.</p>:testRuns.filter(t=>t.product_id===id).map(t=><div className="watchlist-row" key={t.id}><span>{shortDate(t.start_date)} · {t.sales} vendas</span><strong>{brl(t.revenue-t.spend,product.currency)}*</strong></div>)}<Link href={`/simulator?product=${id}`} className="btn wide mt-2"><BarChart3 size={16}/> Simular e registrar testes</Link><p className="micro mt-2">* Receita menos gasto com anúncio, sem descontar outros custos.</p></Section>
  </div></div>
  {edit&&<Modal title="Editar produto" onClose={()=>setEdit(false)}><ProductForm product={product} onCancel={()=>setEdit(false)} onComplete={()=>setEdit(false)}/></Modal>}
  {addAd&&<Modal title="Adicionar anúncio" subtitle={`Produto: ${product.name}`} onClose={()=>setAddAd(false)}><AdForm productId={id} onComplete={()=>setAddAd(false)} onCancel={()=>setAddAd(false)}/></Modal>}
  {inspect&&<AdInspector ad={ads.find(a=>a.id===inspect.id)||inspect} onClose={()=>setInspect(null)}/>}
  </>;
}
