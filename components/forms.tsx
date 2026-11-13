'use client';
import { useState } from 'react';
import type { Product, Ad, ProductStatus, ProductType, Platform, AdStatus } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { Field, Feedback } from '@/components/ui';
import { safeHttpUrl } from '@/lib/utils';
import { LoaderCircle, Save, ScanSearch, AlertTriangle } from 'lucide-react';
import { parseMetaLibraryUrl, type MetaInspection } from '@/lib/meta-library';
import {useLocale} from '@/components/locale';
import {CurrencyPicker,MarketLanguagePicker} from '@/components/global-options';
const blankProduct={name:'',niche:'',product_type:'digital' as ProductType,country:'Brasil',language:'pt-BR',currency:'BRL',sale_price:'',fulfillment_cost:'',extra_cost:'',landing_url:'',checkout_url:'',landing_copy:'',promise:'',target_audience:'',notes:'',status:'researching' as ProductStatus};
export function ProductForm({product,onComplete,onCancel}:{product?:Product;onComplete:(id:string)=>void;onCancel:()=>void}) {
  const {supabase,refresh}=useWorkspace();
  const {t,defaultCurrency}=useLocale();
  const [values,setValues]=useState({...blankProduct,...(product?{...product,sale_price:product.sale_price?.toString()||'',fulfillment_cost:product.fulfillment_cost?.toString()||'',extra_cost:product.extra_cost?.toString()||''}:{currency:defaultCurrency})});
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const set=(key:string,val:string)=>setValues(prev=>({...prev,[key]:val}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Faça login novamente.');
      if(!values.name.trim())throw new Error('Informe o nome do produto.');
      for(const x of [values.landing_url,values.checkout_url])if(x&&!safeHttpUrl(x))throw new Error('Informe URLs válidas iniciadas com https:// ou http://.');
      const data={user_id:user.id,name:values.name.trim(),niche:values.niche.trim(),product_type:values.product_type,country:values.country.trim(),language:values.language,currency:values.currency,
        sale_price:values.sale_price===''?null:Number(values.sale_price),fulfillment_cost:values.fulfillment_cost===''?null:Number(values.fulfillment_cost),extra_cost:values.extra_cost===''?null:Number(values.extra_cost),
        landing_url:safeHttpUrl(values.landing_url),checkout_url:safeHttpUrl(values.checkout_url),landing_copy:values.landing_copy.trim(),promise:values.promise.trim(),target_audience:values.target_audience.trim(),notes:values.notes.trim(),status:values.status};
      if([data.sale_price,data.fulfillment_cost,data.extra_cost].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Os custos e preços devem ser números positivos.');
      let id=product?.id;
      if(product){const {error}=await supabase.from('products').update(data).eq('id',product.id);if(error)throw error;}
      else{const {data:created,error}=await supabase.from('products').insert(data).select('id').single();if(error)throw error;id=created.id;}
      await refresh();onComplete(id!);
    }catch(err){setError(err instanceof Error?err.message:'Erro inesperado');}
    finally{setSaving(false);}
  }
  return <form onSubmit={submit} className="form-grid">
    <div className="full form-intro"><strong>{t('essentials')}</strong><small>{t('productsDescription')}</small></div>
    <div className="full"><Field label={t('productName')+' *'}>
      <input className="input" autoFocus required maxLength={150} value={values.name} onChange={e=>set('name',e.target.value)} placeholder={t('productPlaceholder')}/>
    </Field></div>
    <div className="full"><Field label={t('salesPage')}>
      <input type="url" className="input" value={values.landing_url} onChange={e=>set('landing_url',e.target.value)} placeholder="https://..."/>
    </Field></div>
    <Field label={t('price')}>
      <input type="number" min="0" step="0.01" className="input" value={values.sale_price} onChange={e=>set('sale_price',e.target.value)} placeholder="47.00"/>
    </Field>
    <Field label={t('currency')}><CurrencyPicker value={values.currency} onChange={v=>set('currency',v)}/></Field>

    <div className="full">
      <details className="advanced-details" key={product?.id||'new'}>
        <summary>{t('advanced')}</summary>
        <div className="advanced-grid">
          <Field label={t('niche')}><input className="input" maxLength={100} value={values.niche} onChange={e=>set('niche',e.target.value)} placeholder="Pets, Educação, Beleza..."/></Field>
          <Field label={t('productType')}><select className="input" value={values.product_type} onChange={e=>set('product_type',e.target.value)}>
            <option value="digital">{t('digital')}</option><option value="physical">{t('physical')}</option><option value="saas">SaaS</option><option value="service">{t('service')}</option>
          </select></Field>
          <Field label={t('country')}><input className="input" maxLength={100} value={values.country} onChange={e=>set('country',e.target.value)}/></Field>
          <Field label={t('offerLanguage')}><MarketLanguagePicker value={values.language} onChange={v=>set('language',v)}/></Field>
          <Field label={t('researchStatus')}><select className="input" value={values.status} onChange={e=>set('status',e.target.value)}>
            <option value="researching">{t('researching')}</option><option value="ready">{t('ready')}</option>
            <option value="testing">{t('testing')}</option><option value="winning">{t('winning')}</option>
            <option value="discarded">{t('discarded')}</option>
          </select></Field>
          <Field label={t('cost')}><input type="number" min="0" step="0.01" className="input" value={values.fulfillment_cost} onChange={e=>set('fulfillment_cost',e.target.value)} placeholder="0.00"/></Field>
          <Field label={t('fees')}><input type="number" min="0" step="0.01" className="input" value={values.extra_cost} onChange={e=>set('extra_cost',e.target.value)} placeholder="0.00"/></Field>
          <Field label={t('checkout')}><input type="url" className="input" value={values.checkout_url} onChange={e=>set('checkout_url',e.target.value)} placeholder="https://..."/></Field>
          <div className="full"><Field label={t('pageCopy')}><textarea className="textarea" maxLength={12000} rows={4} value={values.landing_copy} onChange={e=>set('landing_copy',e.target.value)}/></Field></div>
          <div className="full"><Field label={t('promise')}><textarea className="textarea" maxLength={2000} rows={2} value={values.promise} onChange={e=>set('promise',e.target.value)}/></Field></div>
          <div className="full"><Field label={t('audience')}><input className="input" maxLength={300} value={values.target_audience} onChange={e=>set('target_audience',e.target.value)}/></Field></div>
          <div className="full"><Field label={t('notes')}><textarea className="textarea" maxLength={5000} value={values.notes} onChange={e=>set('notes',e.target.value)}/></Field></div>
        </div>
      </details>
    </div>
    {error&&<div className="full"><Feedback type="error">{error}</Feedback></div>}
    <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} {t('save')}</button>
    </div>
  </form>;
}
const blankAd={name:'',product_id:'',platform:'meta' as Platform,advertiser:'',ad_url:'',ad_copy:'',hook:'',cta:'',notes:'',started_at:'',first_seen_at:new Date().toISOString().slice(0,10),observed_active:'unknown' as AdStatus,is_favorite:false,meta_library_id:null as string|null,link_check_result:'not_checked' as const,last_checked_at:null as string|null,last_check_message:'',started_at_source:'unknown' as const,status_source:'unknown' as const};
export function AdForm({ad,productId,onComplete,onCancel}:{ad?:Ad;productId?:string;onComplete:()=>void;onCancel:()=>void}){
  const {supabase,products,refresh}=useWorkspace();
  const {t,defaultCurrency}=useLocale();
  const [addingProduct,setAddingProduct]=useState(false);
  const [newProductName,setNewProductName]=useState('');
  const [manual,setManual]=useState(false);
  const [values,setValues]=useState({...blankAd,...(ad?{...ad,first_seen_at:ad.first_seen_at||'',started_at:ad.started_at||''}:{product_id:productId||''})});
  const [file,setFile]=useState<File|null>(null);const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const [checking,setChecking]=useState(false);const [inspection,setInspection]=useState<MetaInspection|null>(null);
  async function inspectLink(){
    setError('');setInspection(null);
    if(!values.ad_url.trim())return setError('Cole primeiro o link de um anúncio da Biblioteca da Meta.');
    setChecking(true);
    try{
      const res=await fetch('/api/meta/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:values.ad_url})});
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||'Não foi possível consultar este link.');
      const imported=result as MetaInspection;
      setInspection(imported);
      setManual(imported.result!=='verified');
      setValues(prev=>({...prev,platform:'meta',ad_url:imported.normalizedUrl,
        name:prev.name||`Anúncio Meta${imported.adId?' #'+imported.adId:''}`,
        started_at:imported.startedAt||prev.started_at,
        observed_active:imported.status!=='unknown'?imported.status:prev.observed_active}));
    }catch(e){setError(e instanceof Error?e.message:'Erro ao consultar a Meta.');}
    finally{setChecking(false);}
  }
  const set=(key:string,val:string|boolean)=>setValues(prev=>({...prev,[key]:val}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');
    try{
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Faça login novamente.');
      if(!values.product_id&&!newProductName.trim())throw new Error(t('noProduct'));
      if(values.ad_url&&!safeHttpUrl(values.ad_url))throw new Error('O link do anúncio deve começar com https:// ou http://.');
      if(file){if(file.size>30*1024*1024)throw new Error('Arquivo de até 30 MB.');if(!['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'].includes(file.type))throw new Error('Formato permitido: PNG, JPG, WEBP, GIF, MP4 ou WEBM.');}
      let metaId:string|null=null;
      if(values.platform==='meta'&&values.ad_url){try{metaId=parseMetaLibraryUrl(values.ad_url).adId;}catch{ /* Link genérico salvo manualmente. */ }}
      const checkIsCurrent=!!inspection&&inspection.normalizedUrl===safeHttpUrl(values.ad_url);
      const startedSource=values.started_at?(checkIsCurrent&&inspection?.startedAt===values.started_at?'public_page':
        !inspection&&ad?.started_at===values.started_at?ad.started_at_source:'manual'):'unknown';
      const statusSource=values.observed_active==='unknown'?'unknown':checkIsCurrent&&inspection?.status===values.observed_active?'public_page':
        !inspection&&ad?.observed_active===values.observed_active?ad.status_source:'manual';
      let selectedProductId=values.product_id;
      if(!selectedProductId){
        const {data:createdProduct,error:createError}=await supabase.from('products').insert({
          user_id:user.id,name:newProductName.trim(),currency:defaultCurrency,language:'pt-BR',
          product_type:'digital',country:'Brasil'
        }).select('id').single();
        if(createError)throw new Error('Não foi possível criar o produto: '+createError.message);
        selectedProductId=createdProduct.id;
      }
      const adName=values.name.trim()||(metaId?'Anúncio Meta #'+metaId:'Anúncio - '+(newProductName.trim()||products.find(p=>p.id===selectedProductId)?.name||'oferta'));
      const row={user_id:user.id,product_id:selectedProductId,name:adName,platform:values.platform,advertiser:values.advertiser.trim(),ad_url:safeHttpUrl(values.ad_url),ad_copy:values.ad_copy.trim(),hook:values.hook.trim(),cta:values.cta.trim(),notes:values.notes.trim(),started_at:values.started_at||null,first_seen_at:values.first_seen_at||null,observed_active:values.observed_active,is_favorite:values.is_favorite,
        meta_library_id:metaId,
        link_check_result:checkIsCurrent?inspection!.result:ad?.ad_url===safeHttpUrl(values.ad_url)?ad.link_check_result:'not_checked',
        last_checked_at:checkIsCurrent?inspection!.checkedAt:ad?.ad_url===safeHttpUrl(values.ad_url)?ad.last_checked_at:null,
        last_check_message:checkIsCurrent?inspection!.message:ad?.ad_url===safeHttpUrl(values.ad_url)?ad.last_check_message:'',
        started_at_source:startedSource,status_source:statusSource};
      let id=ad?.id;
      if(ad){const {error}=await supabase.from('ads').update(row).eq('id',ad.id);if(error)throw error;}
      else{const {data,error}=await supabase.from('ads').insert(row).select('id').single();if(error)throw error;id=data.id;}
      if(file&&id){const ext=file.name.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g,'')||'bin';const path=`${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from('creatives').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw new Error(`Anúncio salvo, mas mídia não enviada: ${uploadError.message}`);
        const {error:upErr}=await supabase.from('ads').update({creative_path:path,creative_type:file.type.startsWith('video')?'video':'image'}).eq('id',id);if(upErr)throw upErr;
        if(ad?.creative_path){await supabase.storage.from('creatives').remove([ad.creative_path]);}
      }
      if(checkIsCurrent&&id){
        const {error:logError}=await supabase.from('ad_snapshots').insert({user_id:user.id,ad_id:id,status:inspection!.status,check_method:'link',check_result:inspection!.result,notes:inspection!.message});
        if(logError)throw new Error(`Anúncio salvo, mas o histórico falhou: ${logError.message}`);
      }
      await refresh();onComplete();
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar');}finally{setSaving(false);}
  }
  return <form className="form-grid" onSubmit={submit}>
    <div className="full form-intro"><strong>{t('essentials')}</strong><small>{t('autoOnly')}</small></div>
    <div className="full">
      <Field label={t('metaLink')}>
        <input type="url" className="input" autoFocus value={values.ad_url}
          onChange={e=>{set('ad_url',e.target.value);setInspection(null);}}
          placeholder="https://www.facebook.com/ads/library/?id=..."/>
      </Field>
      <div className="flex wrap gap-2 mt-2">
        <button type="button" className="btn btn-primary" onClick={inspectLink} disabled={checking||!values.ad_url.trim()}>
          {checking?<LoaderCircle size={15} className="spin"/>:<ScanSearch size={15}/>}
          {checking?t('importing'):t('import')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={()=>setManual(x=>!x)}>{t('manual')}</button>
      </div>
    </div>
    {inspection&&<div className="full">
      <Feedback type={inspection.result==='verified'?'success':'info'}>
        <span><strong>{inspection.result==='verified'?t('verified'):t('unavailable')}</strong>
          {' — '+inspection.message}{inspection.adId&&<span> ID: {inspection.adId}.</span>}
          {inspection.startedAt&&<span> {t('startDate')}: {inspection.startedAt}.</span>}
        </span>
      </Feedback>
    </div>}
    <div className="full">
      {products.length>0&&!addingProduct&&<>
        <Field label={t('associatedProduct')}>
          <select className="input" value={values.product_id} onChange={e=>set('product_id',e.target.value)}>
            <option value="">{t('selectProduct')}</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <button type="button" className="small-link inline-link" onClick={()=>{setAddingProduct(true);set('product_id','');}}>+ {t('newProduct')}</button>
      </>}
      {(products.length===0||addingProduct)&&<>
        <Field label={t('quickProduct')}>
          <input className="input" maxLength={150} value={newProductName} onChange={e=>setNewProductName(e.target.value)} placeholder={t('productPlaceholder')}/>
        </Field>
        {products.length>0&&<button type="button" className="small-link inline-link" onClick={()=>{setAddingProduct(false);setNewProductName('');}}>{t('selectProduct')}</button>}
      </>}
    </div>
    <div className="full">
      <Field label={t('upload')}>
        <input className="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)}/>
      </Field>
    </div>
    {manual&&<div className="full manual-box">
      <strong>{t('manual')}</strong>
      <div className="advanced-grid mt-2">
        <Field label={t('startDate')}><input type="date" max={new Date().toISOString().slice(0,10)} className="input" value={values.started_at} onChange={e=>set('started_at',e.target.value)}/></Field>
        <Field label={t('observedStatus')}>
          <select className="input" value={values.observed_active} onChange={e=>set('observed_active',e.target.value)}>
            <option value="unknown">{t('unknown')}</option><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option>
          </select>
        </Field>
        <div className="full"><Field label={t('adCopy')}>
          <textarea className="textarea" maxLength={10000} rows={3} value={values.ad_copy} onChange={e=>set('ad_copy',e.target.value)}/>
        </Field></div>
      </div>
    </div>}
    <div className="full"><details className="advanced-details">
      <summary>{t('advanced')}</summary>
      <div className="advanced-grid">
        <Field label={t('adTitle')}><input className="input" maxLength={150} value={values.name} onChange={e=>set('name',e.target.value)} placeholder="Criativo 01"/></Field>
        <Field label={t('platform')}><select className="input" value={values.platform} onChange={e=>set('platform',e.target.value)}>
          <option value="meta">Meta (Facebook / Instagram)</option><option value="tiktok">TikTok</option>
          <option value="google">Google</option><option value="youtube">YouTube</option><option value="other">Outra</option>
        </select></Field>
        <Field label={t('advertiser')}><input className="input" maxLength={160} value={values.advertiser} onChange={e=>set('advertiser',e.target.value)}/></Field>
        <Field label={t('firstSeen')}><input type="date" className="input" value={values.first_seen_at} onChange={e=>set('first_seen_at',e.target.value)}/></Field>
        <div className="full"><Field label={t('adCopy')}><textarea className="textarea" maxLength={10000} rows={4} value={values.ad_copy} onChange={e=>set('ad_copy',e.target.value)}/></Field></div>
        <div className="full"><Field label={t('hook')}><input className="input" maxLength={1000} value={values.hook} onChange={e=>set('hook',e.target.value)}/></Field></div>
        <Field label="CTA"><input className="input" maxLength={200} value={values.cta} onChange={e=>set('cta',e.target.value)}/></Field>
        <div className="full"><Field label={t('notes')}><textarea className="textarea" maxLength={3000} value={values.notes} onChange={e=>set('notes',e.target.value)}/></Field></div>
        <label className="full flex gap-2 center"><input type="checkbox" checked={values.is_favorite} onChange={e=>set('is_favorite',e.target.checked)}/> {t('favorite')}</label>
      </div>
    </details></div>
    {error&&<div className="full"><Feedback type="error">{error}</Feedback></div>}
    <div className="form-actions">
      <button type="button" onClick={onCancel} className="btn btn-ghost">{t('cancel')}</button>
      <button type="submit" disabled={saving} className="btn btn-primary">{saving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} {t('save')}</button>
    </div>
  </form>;
}
