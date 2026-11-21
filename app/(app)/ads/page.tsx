'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, ExternalLink, ImagePlus, Plus, Search, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { Modal, PageHeading, Empty, Load, StatusPill } from '@/components/ui';
import { AdForm } from '@/components/forms';
import { Creative } from '@/components/creative';
import { AdInspector } from '@/components/ad-inspector';
import { shortDate,safeHttpUrl } from '@/lib/utils';
import {useLocale} from '@/components/locale';
import {advertiserLibraryUrl,sameHttpUrl,offerLibraryUrl} from '@/lib/library-links';
import {metaAdsLibraryUrl,metaSearchUrlForWebsite,repairMetaLibraryLink} from '@/lib/meta-search';
export default function Ads(){
  const {products,ads,adsLoading,adsError,refresh}=useWorkspace();
  const {t}=useLocale();
  const [open,setOpen]=useState(false);const [recordProductId,setRecordProductId]=useState('');const [inspecting,setInspecting]=useState<Ad|null>(null);
  const [websiteQuery,setWebsiteQuery]=useState('');
  const [search,setSearch]=useState('');const [platform,setPlatform]=useState('all');const [productId,setProductId]=useState('all');const [favorites,setFavorites]=useState(false);
  const filtered=useMemo(()=>ads.filter(a=>(!favorites||a.is_favorite)&&(platform==='all'||a.platform===platform)&&(productId==='all'||a.product_id===productId)&&(`${a.name} ${a.advertiser} ${a.hook} ${a.ad_copy} ${products.find(p=>p.id===a.product_id)?.name||''}`).toLowerCase().includes(search.toLowerCase())),[ads,search,platform,productId,favorites,products]);
  const referenceProducts=useMemo(()=>products.filter(p=>
    (productId==='all'||p.id===productId)&&
    (!search.trim()||[p.name,p.niche,p.country,p.promise].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  ).slice(0,12),[products,productId,search]);
  const hasFilters=Boolean(search.trim()||productId!=='all'||platform!=='all'||favorites);
  const websiteLibraryUrl=metaSearchUrlForWebsite(websiteQuery);
  const domainLibraryUrl=metaSearchUrlForWebsite(websiteQuery,'path');
  function clearFilters(){setSearch('');setProductId('all');setPlatform('all');setFavorites(false);}
  function addAdForProduct(id=''){setRecordProductId(id);setOpen(true);}
  return <><PageHeading eyebrow={t("ads")} title={t("adsTitle")} description={t("adsDescription")} action={<button className="btn btn-primary" onClick={()=>addAdForProduct()}><Plus size={17}/>{t("newAd")}</button>}/>
  <section className="panel" aria-label="Pesquisar domínio na Biblioteca de Anúncios da Meta" style={{marginBottom:16}}>
    <div className="micro">PESQUISA DIRETA · META ADS LIBRARY</div>
    <h2 style={{fontSize:18,margin:'6px 0'}}>Pesquisar anúncios pelo link da oferta</h2>
    <p className="muted" style={{fontSize:13,marginBottom:10}}>Cole o site com ou sem https://. A pesquisa principal usa só o domínio, sem https:// nem caminho, para evitar resultados vazios. Pesquisa por URL não garante que a Meta indexe o anúncio.</p>
    <div className="flex wrap gap-2 center">
      <input className="input" type="text" inputMode="url" aria-label="Link do site para pesquisar"
        style={{flex:'1 1 240px',minWidth:0}} value={websiteQuery}
        onChange={e=>setWebsiteQuery(e.target.value)} placeholder="tafeljoy.shop/de/"/>
      {websiteLibraryUrl?<a className="btn btn-primary" href={websiteLibraryUrl} target="_blank" rel="noopener noreferrer">
        Abrir na Biblioteca Meta <ExternalLink size={15}/></a>:<span className="micro">Informe um domínio válido, como tafeljoy.shop/de/.</span>}
      {domainLibraryUrl&&domainLibraryUrl!==websiteLibraryUrl&&<a className="btn" href={domainLibraryUrl}
        target="_blank" rel="noopener noreferrer">Pesquisar caminho específico <Search size={14}/></a>}
    </div>
    <p className="micro mt-2">Pesquisa pública por termo. Não há confirmação automática de anúncios ativos.</p>
  </section>
  <div className="toolbar"><div className="search-box"><Search size={16}/><input className="input" placeholder={t("search") + "..."} value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="select" value={productId} onChange={e=>setProductId(e.target.value)}><option value="all">{t("products")}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="select" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="all">{t("platform")}</option><option value="meta">Meta</option><option value="tiktok">TikTok</option><option value="google">Google</option><option value="youtube">YouTube</option><option value="other">Outra</option></select><button onClick={()=>setFavorites(!favorites)} className={`btn ${favorites?'btn-primary':'btn-ghost'}`}><Bookmark size={15}/>{t("favoriteOnly")}</button></div>
  {adsError&&<div className="panel" role="alert">
    <p>Não foi possível carregar os anúncios. {adsError}</p>
    <button type="button" className="btn" onClick={()=>void refresh()}>Tentar novamente</button>
  </div>}
  {adsLoading?<div className="panel" role="status"><Load/></div>:filtered.length===0?(adsError?null:<div className="panel"><Empty icon={<ImagePlus size={26}/>} headline={ads.length===0?'Nenhum anúncio salvo ainda':'Nenhum anúncio corresponde aos filtros'} description={ads.length===0?'As ofertas cadastradas não criam anúncios automaticamente. Pesquise na Biblioteca da Meta e salve os anúncios individuais encontrados.':'Altere a pesquisa ou limpe os filtros para ver os anúncios cadastrados.'} action={hasFilters&&ads.length>0?<button className="btn btn-primary" onClick={clearFilters}>Limpar filtros</button>:<button className="btn btn-primary" onClick={()=>addAdForProduct()}><Plus size={16}/> Salvar anúncio</button>}/></div>):<div className="card-grid">{filtered.map(ad=><div className="ad-card" key={ad.id}><Creative ad={ad}/><div className="flex between center"><span className="card-tag">{ad.platform?.toUpperCase()||'OUTRA'}</span>{ad.is_favorite&&<Bookmark size={16} color="#3ce0a1" fill="#3ce0a1"/>}<StatusPill value={ad.observed_active}/></div><div><h3>{ad.name}</h3><p className="mt-2">{products.find(p=>p.id===ad.product_id)?.name||'Produto'} · {ad.advertiser||'Anunciante desconhecido'}</p></div><p style={{minHeight:38}}>{ad.hook||ad.ad_copy?.slice(0,130)||'Sem copy cadastrada.'}</p><div className="micro">Encontrado em: {shortDate(ad.first_seen_at)}{ad.started_at?` · Início informado: ${shortDate(ad.started_at)}`:''}</div>
        {ad.platform==='meta'&&ad.link_check_result!=='verified'&&ad.link_check_result!=='not_checked'&&<p style={{color:'#efc77a',fontSize:12}}>Dados incompletos: abra a análise para complementar manualmente.</p>}<div className="ad-actions"><button className="btn btn-primary" onClick={()=>setInspecting(ad)}>Abrir análise <ArrowUpRight size={14}/></button>{safeHttpUrl(ad.ad_url)&&<a href={ad.platform==='meta'?repairMetaLibraryLink(ad.ad_url):safeHttpUrl(ad.ad_url)} className="btn" target="_blank" rel="noopener noreferrer">{ad.platform==='meta'?'Biblioteca Meta':'Original'} <ExternalLink size={13}/></a>}{ad.platform==='meta'&&metaSearchUrlForWebsite(products.find(p=>p.id===ad.product_id)?.landing_url||'')&&<a className="btn" href={metaSearchUrlForWebsite(products.find(p=>p.id===ad.product_id)?.landing_url||'')} target="_blank" rel="noopener noreferrer">Buscar domínio <Search size={13}/></a>}{advertiserLibraryUrl(ad)&&!sameHttpUrl(advertiserLibraryUrl(ad),ad.ad_url)&&<a href={advertiserLibraryUrl(ad)} className="btn" target="_blank" rel="noopener noreferrer">Biblioteca do anunciante <ExternalLink size={13}/></a>}</div></div>)}</div>}
  {!adsLoading&&products.length>0&&<section className="panel mt-3" aria-label="Pesquisas de anúncios relacionadas às ofertas">
    <div className="flex between center wrap gap-2">
      <div>
        <div className="micro">REFERÊNCIAS PARA PESQUISAR</div>
        <h2 style={{fontSize:19,margin:'6px 0'}}>Pesquisar anúncios das ofertas cadastradas</h2>
        <p className="muted" style={{fontSize:13}}>Estas são ofertas do seu Caçador, não anúncios confirmados. Abra a pesquisa na Meta e salve os anúncios individuais para que apareçam em “Meus anúncios”.</p>
      </div>
      <button className="btn btn-ghost" onClick={()=>void refresh()}>Atualizar lista</button>
    </div>
    {referenceProducts.length===0?<p className="muted mt-3" style={{fontSize:13}}>Não há ofertas com esses filtros. <button className="small-link inline-link" type="button" onClick={clearFilters}>Limpar filtros</button></p>:
      <div className="card-grid mt-3">
        {referenceProducts.map(p=>{
          const library=offerLibraryUrl(p,ads.filter(ad=>ad.product_id===p.id));
          const searchUrl=metaSearchUrlForWebsite(p.landing_url)||metaAdsLibraryUrl(p.name);
          const onlyDomainUrl=metaSearchUrlForWebsite(p.landing_url,'path');
          return <article key={p.id} className="panel" style={{padding:14}}>
            <span className="micro">{p.niche||'Nicho não informado'} · Pesquisa não verificada</span>
            <h3 style={{fontSize:15,margin:'8px 0'}}>{p.name}</h3>
            <p className="muted" style={{fontSize:12}}>Anúncios salvos: {ads.filter(ad=>ad.product_id===p.id).length}</p>
            <div className="flex wrap gap-2 mt-3">
              {library&&<a className="btn" href={library} target="_blank" rel="noopener noreferrer">Biblioteca do anunciante <ExternalLink size={13}/></a>}
              <a className="btn" href={searchUrl} target="_blank" rel="noopener noreferrer">Pesquisar na Meta <Search size={13}/></a>
              {onlyDomainUrl&&onlyDomainUrl!==searchUrl&&<a className="btn" href={onlyDomainUrl}
                target="_blank" rel="noopener noreferrer">Com caminho <Search size={13}/></a>}
              <button className="btn btn-primary" type="button" onClick={()=>addAdForProduct(p.id)}>Salvar anúncio <Plus size={13}/></button>
              <Link className="small-link" href={'/products/'+p.id}>Ver oferta <ArrowUpRight size={13}/></Link>
            </div>
          </article>;
        })}
      </div>}
    {referenceProducts.length<products.length&&<p className="micro mt-2">Exibindo até 12 ofertas. <Link href="/products" className="small-link">Ver todas as ofertas</Link></p>}
  </section>}
  {!adsLoading&&!adsError&&products.length===0&&ads.length===0&&<p className="muted mt-3" style={{fontSize:13}}>Você pode criar uma oferta e salvar o primeiro anúncio no mesmo formulário. Também pode <Link className="small-link" href="/products">cadastrar ofertas</Link> antes.</p>}
  <p className="muted mt-3" style={{fontSize:11}}>A consulta tenta ler dados textuais públicos de um anúncio individual da Meta. Se a plataforma limitar o acesso, o sistema avisa e permite salvar manualmente. Não confirma vendas, lucro nem gasto do anunciante.</p>
  {open&&<Modal title={t("newAd")} subtitle={t("adsDescription")} onClose={()=>setOpen(false)}><AdForm productId={recordProductId||undefined} onComplete={()=>setOpen(false)} onCancel={()=>setOpen(false)}/></Modal>}
  {inspecting&&<AdInspector ad={ads.find(a=>a.id===inspecting.id)||inspecting} onClose={()=>setInspecting(null)}/>}
  </>;
}
