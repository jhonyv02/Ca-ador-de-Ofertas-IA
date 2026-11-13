'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {GitCompareArrows,ArrowUpRight,ArrowRight,Download} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {useLocale} from '@/components/locale';
import {PageHeading,Empty,Load,ScoreRing,StatusPill} from '@/components/ui';
import {opportunityScore,brl,downloadCsv} from '@/lib/utils';

export default function Compare(){
 const {t}=useLocale();
 const {products,ads,latestAnalysis,loading}=useWorkspace();
 const [manualSelection,setManualSelection]=useState<string[]|null>(null);
 const ranked=useMemo(()=>products.map(p=>{
   const items=ads.filter(a=>a.product_id===p.id);
   return {product:p,ads:items,score:opportunityScore(p,items,latestAnalysis(p.id))};
 }).sort((a,b)=>b.score.score-a.score.score),[products,ads,latestAnalysis]);
 const defaultIds=ranked.slice(0,3).map(x=>x.product.id);
 const selected=manualSelection??defaultIds;
 const compared=ranked.filter(x=>selected.includes(x.product.id));
 return <>
  <PageHeading eyebrow={t('compare')} title={t('compare')}
   description={t('productsDescription')}
   action={<button className="btn" disabled={compared.length===0} onClick={()=>downloadCsv('comparacao-produtos.csv',
    ['Produto','Pontuação','Confiança','Moeda','Preço','Custo','Anúncios'],
    compared.map(x=>[x.product.name,x.score.score,x.score.confidence,x.product.currency,
      x.product.sale_price,(x.product.fulfillment_cost||0)+(x.product.extra_cost||0),x.ads.length]))}>
      <Download size={15}/>{t('export')}</button>}/>
  {loading?<Load/>:products.length===0?
   <div className="panel"><Empty icon={<GitCompareArrows size={25}/>} headline={t('noProducts')}
    description={t('productsDescription')} action={<Link href="/products" className="btn btn-primary">
      {t('newProduct')} <ArrowRight size={14}/></Link>}/></div>
   :<>
    <details className="advanced-details mb-2">
      <summary>{t('products')} ({selected.length}/3)</summary>
      <div className="advanced-grid">
        {products.map(p=><label key={p.id} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <input type="checkbox" checked={selected.includes(p.id)}
            disabled={!selected.includes(p.id)&&selected.length>=3}
            onChange={e=>setManualSelection(prev=>{
              const ids=prev??defaultIds;
              return e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id);
            })}/>
          <span>{p.name}</span>
        </label>)}
      </div>
    </details>
    {compared.length===0?<div className="panel">
      <Empty icon={<GitCompareArrows size={24}/>} headline={t('noProducts')}
       description={t('productsDescription')}/></div>
    :<div className="compare-grid">{compared.map(({product:p,ads:items,score})=>{
      const cost=(p.fulfillment_cost||0)+(p.extra_cost||0);
      const contribution=p.sale_price===null?null:p.sale_price-cost;
      const model=latestAnalysis(p.id);
      return <div className="compare-item" key={p.id}>
        <div className="flex between center"><StatusPill value={p.status}/><ScoreRing value={score.score}/></div>
        <h3 className="mt-3">{p.name}</h3><div className="micro mb-2">{score.confidence}</div>
        <div className="compare-metric"><span>{t('ads')}</span><strong>{items.length}</strong></div>
        <div className="compare-metric"><span>{t('price')}</span><strong>{p.sale_price===null?'—':brl(p.sale_price,p.currency)}</strong></div>
        <div className="compare-metric"><span>Limite de CPA estimado</span><strong>{contribution===null?'—':brl(contribution,p.currency)}</strong></div>
        <p className="muted" style={{fontSize:12,lineHeight:1.5}}>{model?.summary||p.promise||'Sem análise IA. Adicione evidências para uma avaliação melhor.'}</p>
        <details className="advanced-details" style={{marginBottom:14}}>
         <summary>{t('advanced')}</summary><div style={{padding:14}}>
          <div className="compare-metric"><span>{t('cost')}</span><strong>{brl(cost,p.currency)}</strong></div>
          <div className="compare-metric"><span>{t('active')}</span><strong>{items.filter(a=>a.observed_active==='active').length}</strong></div>
          <div className="compare-metric"><span>Risco IA</span><strong>{model?.risks?.[0]||'Não analisado'}</strong></div>
         </div>
        </details>
        <Link className="btn btn-primary wide" href={`/products/${p.id}`}>{t('compare')} <ArrowUpRight size={15}/></Link>
      </div>;
    })}</div>}
    <div className="info-note mt-3">A pontuação orienta a pesquisa e não comprova vendas ou lucro. Compare dados reais dos seus testes antes de investir mais.</div>
   </>}
 </>;
}
