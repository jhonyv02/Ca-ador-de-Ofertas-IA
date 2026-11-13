'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowRight,ExternalLink,Plus,LibraryBig,Megaphone,Target,Search} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {useLocale} from '@/components/locale';
import {AdForm,ProductForm} from '@/components/forms';
import {Modal,PageHeading,Section,Empty,Load,ScoreRing,Feedback} from '@/components/ui';
import {opportunityScore} from '@/lib/utils';

export default function Dashboard() {
 const {t}=useLocale();
 const {products,ads,loading,error,latestAnalysis}=useWorkspace();
 const [newAd,setNewAd]=useState(false);const [newProduct,setNewProduct]=useState(false);
 const ranked=useMemo(()=>products.map(p=>{
   const items=ads.filter(a=>a.product_id===p.id);
   return {product:p,items,score:opportunityScore(p,items,latestAnalysis(p.id))};
 }).sort((a,b)=>b.score.score-a.score.score),[products,ads,latestAnalysis]);
 const dbMissing=/schema cache|could not find the table|pgrst205/i.test(error);
 return <>
  <PageHeading eyebrow={t('dashboard')} title={t('overview')} description={t('quickStart')}
   action={<button className="btn btn-primary" onClick={()=>setNewAd(true)}><Plus size={17}/>{t('newAd')}</button>}/>
  {error&&<div className="mb-2">
    <Feedback type="error">{dbMissing
      ? 'O banco ainda não está configurado. Execute o SQL inicial no Supabase do Caçador de Ofertas.'
      : 'Não foi possível carregar seus dados: '+error}
    </Feedback>
    {dbMissing&&<p className="mt-2"><a className="btn btn-ghost" target="_blank" rel="noopener noreferrer"
      href="https://github.com/jhonyv02/Ca-ador-de-Ofertas-IA/blob/main/supabase/schema.sql">
      Abrir arquivo de instalação do banco <ExternalLink size={14}/>
    </a></p>}
  </div>}
  <section className="banner" style={{marginBottom:20}}>
    <div><strong>1. Encontre o anúncio &nbsp; 2. Salve o link &nbsp; 3. Compare as ofertas</strong>
      <p>{t('autoOnly')}</p>
    </div>
    <div className="flex wrap gap-2">
      <a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
        Meta Ads Library <ExternalLink size={15}/>
      </a>
      <button className="btn btn-primary" onClick={()=>setNewAd(true)}>{t('newAd')} <ArrowRight size={15}/></button>
    </div>
  </section>
  {loading?<Load/>:<>
    <div className="stats-grid simplified-stats">
      <div className="stat"><div><div className="stat-label">{t('products')}</div><div className="stat-value">{products.length}</div></div><LibraryBig size={20}/></div>
      <div className="stat"><div><div className="stat-label">{t('ads')}</div><div className="stat-value">{ads.length}</div></div><Megaphone size={20}/></div>
      <div className="stat"><div><div className="stat-label">{t('ready')}</div><div className="stat-value">{products.filter(p=>p.status==='ready'||p.status==='testing').length}</div></div><Target size={20}/></div>
    </div>
    <Section title={t('compare')} description={t('productsDescription')}
      action={<Link href="/compare" className="small-link">{t('compare')} <ArrowRight size={14}/></Link>}>
      {ranked.length===0
        ? <Empty icon={<Search size={26}/>} headline={t('noProducts')}
            description={t('quickStart')}
            action={<div className="flex wrap gap-2">
              <button className="btn btn-primary" onClick={()=>setNewAd(true)}>{t('newAd')}</button>
              <button className="btn btn-ghost" onClick={()=>setNewProduct(true)}>{t('newProduct')}</button>
            </div>}/>
        : ranked.slice(0,5).map(({product,items,score})=>
            <Link href={`/products/${product.id}`} key={product.id} className="list-row">
              <div className="row-main"><div className="product-icon"><Target size={18}/></div>
                <div><div className="row-title">{product.name}</div>
                <div className="row-meta"><span>{items.length} {t('ads').toLowerCase()}</span><span>{score.confidence}</span></div>
                </div>
              </div>
              <ScoreRing value={score.score} size="sm"/>
            </Link>)}
    </Section>
    <div className="info-note" style={{marginTop:16}}>
      O ranking mostra sinais de pesquisa, não comprova faturamento ou lucro dos concorrentes.
    </div>
  </>}
  {newAd&&<Modal title={t('newAd')} subtitle={t('adsDescription')} onClose={()=>setNewAd(false)}>
    <AdForm onComplete={()=>setNewAd(false)} onCancel={()=>setNewAd(false)}/>
  </Modal>}
  {newProduct&&<Modal title={t('newProduct')} subtitle={t('productsDescription')} onClose={()=>setNewProduct(false)}>
    <ProductForm onComplete={()=>setNewProduct(false)} onCancel={()=>setNewProduct(false)}/>
  </Modal>}
 </>;
}
