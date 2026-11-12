'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BarChart3, Bookmark, ChartNoAxesCombined, CirclePlus, ClipboardList, ExternalLink, LibraryBig, Megaphone, Plus, Search, Sparkles, ArrowUpRight, ArrowRight, Target } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { Modal, PageHeading, Section, Empty, Load, ScoreRing, StatusPill, Feedback } from '@/components/ui';
import { ProductForm } from '@/components/forms';
import { opportunityScore, brl } from '@/lib/utils';
export default function Dashboard(){
  const {products,ads,loading,error,latestAnalysis}=useWorkspace();const [newOpen,setNewOpen]=useState(false);
  const ranked=useMemo(()=>products.map(p=>({p,ads:ads.filter(a=>a.product_id===p.id),score:opportunityScore(p,ads.filter(a=>a.product_id===p.id),latestAnalysis(p.id))})).sort((a,b)=>b.score.score-a.score.score),[products,ads,latestAnalysis]);
  const ready=products.filter(p=>p.status==='ready'||p.status==='testing').length;
  const favorite=ads.filter(a=>a.is_favorite).length;
  return <>
    <PageHeading eyebrow="PAINEL DE INTELIGÊNCIA" title="Visão geral" description="Sua central para encontrar, documentar e avaliar oportunidades de mercado." action={<button className="btn btn-primary" onClick={()=>setNewOpen(true)}><Plus size={17}/> Novo produto</button>}/>
    {error&&<div className="mb-2"><Feedback type="error">Falha ao consultar o banco: {error}. Confirme se a migration SQL foi aplicada.</Feedback></div>}
    {loading?<Load/>:<>
      <div className="stats-grid">
        <div className="stat"><div><div className="stat-label">Produtos monitorados</div><div className="stat-value">{products.length}</div><div className="stat-note">No seu workspace</div></div><div className="stat-icon"><LibraryBig size={21}/></div></div>
        <div className="stat"><div><div className="stat-label">Anúncios salvos</div><div className="stat-value">{ads.length}</div><div className="stat-note">Criativos cadastrados</div></div><div className="stat-icon"><Megaphone size={21}/></div></div>
        <div className="stat"><div><div className="stat-label">Para testar / em teste</div><div className="stat-value">{ready}</div><div className="stat-note">Oportunidades priorizadas</div></div><div className="stat-icon"><Target size={21}/></div></div>
        <div className="stat"><div><div className="stat-label">Anúncios favoritos</div><div className="stat-value">{favorite}</div><div className="stat-note">Referências selecionadas</div></div><div className="stat-icon"><Bookmark size={21}/></div></div>
      </div>
      <div className="banner"><div><strong>Encontre uma oferta. Salve evidências. Decida com critérios.</strong><p>Não use apenas o tempo de veiculação como prova de lucro. Compare margem, oferta, criativos e dados coletados.</p></div><Link href="/ads" className="btn btn-primary">Minha biblioteca <ArrowRight size={16}/></Link></div>
      <div className="two-col">
        <Section title="Radar de oportunidades" description="Ranking por análise da IA ou, quando indisponível, completude de pesquisa." action={<Link href="/compare">Comparar todas <ArrowUpRight size={14}/></Link>}>
          {ranked.length===0?<Empty icon={<Search size={25}/>} headline="Nenhum produto cadastrado" description="Cadastre o primeiro produto e reúna os anúncios dele para começar." action={<button onClick={()=>setNewOpen(true)} className="btn btn-primary"><Plus size={16}/> Cadastrar produto</button>}/>:ranked.slice(0,6).map(({p,ads:items,score})=><Link href={`/products/${p.id}`} key={p.id} className="list-row"><div className="row-main"><div className="product-icon"><BarChart3 size={18}/></div><div><div className="row-title">{p.name}</div><div className="row-meta"><span>{p.niche||p.product_type}</span><span>{items.length} anúncio(s)</span><span>{score.confidence}</span></div></div></div><ScoreRing value={score.score} size="sm"/></Link>)}
        </Section>
        <div>
          <Section title="Status dos produtos" description="Organização do seu funil de pesquisa.">
            {(['researching','ready','testing','winning','discarded'] as const).map(status=>{const count=products.filter(p=>p.status===status).length;return <div key={status} className="watchlist-row"><StatusPill value={status}/><strong>{count}</strong></div>;})}
          </Section>
          <Section title="Acesso rápido" description="Pesquise nas fontes públicas e salve no painel.">
            <div style={{display:'grid',gap:10}}><a target="_blank" rel="noopener noreferrer" className="btn" href="https://www.facebook.com/ads/library/">Meta Ads Library <ExternalLink size={15}/></a><a target="_blank" rel="noopener noreferrer" className="btn" href="https://ads.tiktok.com/business/creativecenter/">TikTok Creative Center <ExternalLink size={15}/></a><Link className="btn" href="/simulator">Simulador de tráfego <ChartNoAxesCombined size={15}/></Link></div>
          </Section>
        </div>
      </div>
      <Section title="Anúncios adicionados recentemente" description="Os últimos criativos que você trouxe para a pesquisa." action={<Link href="/ads">Ver biblioteca <ArrowUpRight size={14}/></Link>}>
        {ads.length===0?<Empty icon={<ClipboardList size={25}/>} headline="A biblioteca ainda está vazia" description="Ao salvar seu primeiro anúncio, ele aparecerá aqui."/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Anúncio</th><th>Produto</th><th>Plataforma</th><th>Status</th><th></th></tr></thead><tbody>{ads.slice(0,5).map(ad=><tr key={ad.id}><td><strong>{ad.name}</strong><div className="micro">{ad.advertiser}</div></td><td>{products.find(p=>p.id===ad.product_id)?.name||'—'}</td><td>{ad.platform.toUpperCase()}</td><td><StatusPill value={ad.observed_active}/></td><td><Link className="small-link" href="/ads">Abrir <ArrowUpRight size={13}/></Link></td></tr>)}</tbody></table></div>}
      </Section>
    </>}
    {newOpen&&<Modal title="Cadastrar uma nova oferta" subtitle="Crie a pasta do produto para começar a organizar os anúncios." onClose={()=>setNewOpen(false)}><ProductForm onCancel={()=>setNewOpen(false)} onComplete={()=>setNewOpen(false)}/></Modal>}
  </>;
}
