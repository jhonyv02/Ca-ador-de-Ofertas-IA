'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Download, FolderSearch, Plus, Search } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { Empty, Load, Modal, PageHeading, ScoreRing, StatusPill } from '@/components/ui';
import { ProductForm } from '@/components/forms';
import { opportunityScore, downloadCsv, brl } from '@/lib/utils';
import { productTypes } from '@/lib/types';
import {useLocale} from '@/components/locale';
export default function Products(){
  const {products,ads,loading,latestAnalysis}=useWorkspace();
  const {t}=useLocale();
  const [newOpen,setNewOpen]=useState(false);const [search,setSearch]=useState('');const [status,setStatus]=useState('all');const [type,setType]=useState('all');
  const filtered=useMemo(()=>products.filter(p=>(status==='all'||p.status===status)&&(type==='all'||p.product_type===type)&&(`${p.name} ${p.niche} ${p.notes}`).toLowerCase().includes(search.toLowerCase())),[products,search,status,type]);
  return <><PageHeading eyebrow={t("products")} title={t("productsTitle")} description={t("productsDescription")} action={<><button className="btn btn-ghost" onClick={()=>downloadCsv('produtos-cacador.csv',['Nome','Nicho','Tipo','Preço','Status','Página'],products.map(p=>[p.name,p.niche,p.product_type,p.sale_price,p.status,p.landing_url]))}><Download size={16}/>{t("export")}</button><button className="btn btn-primary" onClick={()=>setNewOpen(true)}><Plus size={17}/>{t("newProduct")}</button></>}/>
  <div className="toolbar"><div className="search-box"><Search size={16}/><input className="input" placeholder={t("search") + "..."} value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="select" value={type} onChange={e=>setType(e.target.value)}><option value="all">{t("productType")}</option><option value="digital">{t("digital")}</option><option value="physical">{t("physical")}</option><option value="saas">SaaS</option><option value="service">{t("service")}</option></select><select className="select" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{t("researchStatus")}</option><option value="researching">{t("researching")}</option><option value="ready">{t("ready")}</option><option value="testing">{t("testing")}</option><option value="winning">{t("winning")}</option><option value="discarded">{t("discarded")}</option></select></div>
  {loading?<Load/>:filtered.length===0?<div className="panel"><Empty icon={<FolderSearch size={28}/>} headline={t("noProducts")} description="Altere os filtros ou cadastre seu primeiro produto para iniciar a pesquisa." action={<button className="btn btn-primary" onClick={()=>setNewOpen(true)}><Plus size={16}/> Novo produto</button>}/></div>:<div className="card-grid">{filtered.map(p=>{const productAds=ads.filter(a=>a.product_id===p.id);const s=opportunityScore(p,productAds,latestAnalysis(p.id));return <Link className="product-card" href={`/products/${p.id}`} key={p.id}><div className="flex between center"><span className="card-tag">{productTypes[p.product_type]}</span><StatusPill value={p.status}/></div><div><h3>{p.name}</h3><p className="desc">{p.promise||p.niche||'Oferta em pesquisa'}</p></div><div className="flex between center"><div><div className="micro">PREÇO ESTIMADO</div><strong>{p.sale_price!==null?brl(p.sale_price,p.currency):'Não informado'}</strong></div><ScoreRing size="sm" value={s.score}/></div><div className="card-footer"><span className="micro">{productAds.length} anúncio(s) salvo(s)</span><span className="small-link">Ver análise <ArrowRight size={14}/></span></div></Link>})}</div>}
  {newOpen&&<Modal title={t("newProduct")} subtitle={t("productsDescription")} onClose={()=>setNewOpen(false)}><ProductForm onCancel={()=>setNewOpen(false)} onComplete={()=>setNewOpen(false)}/></Modal>}
  </>;
}
