'use client';
import { useMemo, useState } from 'react';
import { Bookmark, ExternalLink, ImagePlus, Plus, Search, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { Modal, PageHeading, Empty, Load, StatusPill } from '@/components/ui';
import { AdForm } from '@/components/forms';
import { Creative } from '@/components/creative';
import { AdInspector } from '@/components/ad-inspector';
import { shortDate } from '@/lib/utils';
export default function Ads(){
  const {products,ads,loading}=useWorkspace();
  const [open,setOpen]=useState(false);const [inspecting,setInspecting]=useState<Ad|null>(null);
  const [search,setSearch]=useState('');const [platform,setPlatform]=useState('all');const [productId,setProductId]=useState('all');const [favorites,setFavorites]=useState(false);
  const filtered=useMemo(()=>ads.filter(a=>(!favorites||a.is_favorite)&&(platform==='all'||a.platform===platform)&&(productId==='all'||a.product_id===productId)&&(`${a.name} ${a.advertiser} ${a.hook} ${a.ad_copy} ${products.find(p=>p.id===a.product_id)?.name||''}`).toLowerCase().includes(search.toLowerCase())),[ads,search,platform,productId,favorites,products]);
  return <><PageHeading eyebrow="ARQUIVO DE CRIATIVOS" title="Biblioteca de anúncios" description="Cole links de anúncios da Meta, tente importar informações públicas e complete manualmente o que estiver indisponível. Tudo fica salvo com histórico." action={<button className="btn btn-primary" onClick={()=>setOpen(true)}><Plus size={17}/> Salvar anúncio</button>}/>
  <div className="toolbar"><div className="search-box"><Search size={16}/><input className="input" placeholder="Buscar por criativo, anunciante, copy..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="select" value={productId} onChange={e=>setProductId(e.target.value)}><option value="all">Todos os produtos</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="select" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="all">Todas plataformas</option><option value="meta">Meta</option><option value="tiktok">TikTok</option><option value="google">Google</option><option value="youtube">YouTube</option><option value="other">Outra</option></select><button onClick={()=>setFavorites(!favorites)} className={`btn ${favorites?'btn-primary':'btn-ghost'}`}><Bookmark size={15}/> Favoritos</button></div>
  {loading?<Load/>:filtered.length===0?<div className="panel"><Empty icon={<ImagePlus size={26}/>} headline="Nenhum anúncio encontrado" description="Salve um link e um print de um anúncio para montar sua biblioteca de referências." action={<button className="btn btn-primary" disabled={products.length===0} onClick={()=>setOpen(true)}><Plus size={16}/> {products.length===0?'Cadastre um produto primeiro':'Salvar anúncio'}</button>}/></div>:<div className="card-grid">{filtered.map(ad=><div className="ad-card" key={ad.id}><Creative ad={ad}/><div className="flex between center"><span className="card-tag">{ad.platform.toUpperCase()}</span>{ad.is_favorite&&<Bookmark size={16} color="#3ce0a1" fill="#3ce0a1"/>}<StatusPill value={ad.observed_active}/></div><div><h3>{ad.name}</h3><p className="mt-2">{products.find(p=>p.id===ad.product_id)?.name||'Produto'} · {ad.advertiser||'Anunciante desconhecido'}</p></div><p style={{minHeight:38}}>{ad.hook||ad.ad_copy.slice(0,130)||'Sem copy cadastrada.'}</p><div className="micro">Encontrado em: {shortDate(ad.first_seen_at)}{ad.started_at?` · Início informado: ${shortDate(ad.started_at)}`:''}</div>
        {ad.platform==='meta'&&ad.link_check_result!=='verified'&&ad.link_check_result!=='not_checked'&&<p style={{color:'#efc77a',fontSize:12}}>Dados incompletos: abra a análise para complementar manualmente.</p>}<div className="ad-actions"><button className="btn btn-primary" onClick={()=>setInspecting(ad)}>Abrir análise <ArrowUpRight size={14}/></button>{ad.ad_url&&<a href={ad.ad_url} className="btn" target="_blank" rel="noopener noreferrer">Original <ExternalLink size={13}/></a>}</div></div>)}</div>}
  <p className="muted mt-3" style={{fontSize:11}}>A consulta tenta ler dados textuais públicos de um anúncio individual da Meta. Se a plataforma limitar o acesso, o sistema avisa e permite salvar manualmente. Não confirma vendas, lucro nem gasto do anunciante.</p>
  {open&&<Modal title="Salvar novo anúncio" subtitle="Associe o criativo a um produto e registre a evidência." onClose={()=>setOpen(false)}><AdForm onComplete={()=>setOpen(false)} onCancel={()=>setOpen(false)}/></Modal>}
  {inspecting&&<AdInspector ad={ads.find(a=>a.id===inspecting.id)||inspecting} onClose={()=>setInspecting(null)}/>}
  </>;
}
