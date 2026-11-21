import {NextResponse} from 'next/server';
import {z} from 'zod';
import type {Analysis} from '@/lib/types';
import {normalizeOfferUrl,repairMetaLibraryLink} from '@/lib/meta-search';
import {parseMetaLibraryUrl} from '@/lib/meta-library';
import {runOfferAnalysis} from '@/lib/openai-analysis';
import {webhookAuthorized,configuredWebhookSecret} from '@/lib/push-payload';
import {researchProgress,canRecommendTest,researchMonitor,researchDecision} from '@/lib/research-pipeline';
import {serviceClient} from '@/lib/supabase/admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const webLink=z.string().url().max(1500).refine(x=>/^https?:\/\//i.test(x),'Link HTTP(S) obrigatório');
const schema=z.object({
  user_id:z.string().uuid(),
  product_id:z.string().uuid().optional(),
  source_key:z.string().regex(/^[a-zA-Z0-9-]{3,80}$/).optional(),
  event_id:z.string().regex(/^[a-zA-Z0-9:_-]{8,120}$/),
  monitor_until:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  offer:z.object({
    name:z.string().trim().min(3).max(150),
    niche:z.string().max(150).optional(),
    country:z.string().max(80).optional(),
    language:z.string().max(20).optional(),
    currency:z.string().regex(/^[A-Z]{3}$/).optional(),
    sale_price:z.number().finite().min(0).max(1000000).nullable().optional(),
    landing_url:z.string().max(1500).optional(),
    ad_library_url:z.string().max(2000).optional(),
    format:z.enum(['printable','templates','planilha','ebook','biblioteca','audio','curso','app']).optional(),
    promise:z.string().max(1000).optional(),
    target_audience:z.string().max(600).optional(),
  }).strict(),
  observation:z.object({
    observed_on:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary:z.string().trim().min(20).max(3500),
    changes:z.array(z.string().trim().min(3).max(400)).max(25).default([]),
    evidence_urls:z.array(webLink).max(20).default([]),
    funnel_hypothesis:z.string().max(600).default(''),
    ads:z.array(z.object({
      url:webLink,name:z.string().max(150).default(''),advertiser:z.string().max(150).default(''),
      status:z.enum(['active','inactive','unknown']).default('unknown'),
      started_at:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
      change:z.string().max(1000).default(''),
    }).strict()).max(12).default([]),
  }).strict(),
}).strict();

function plusSevenDays(iso:string){
  const date=new Date(iso+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+7);
  return date.toISOString().slice(0,10);
}
function isValidDate(x:string){return !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;}

/** Recebe atualizações assinadas do Grok. A IA audita dados registrados, sem alegar ter acessado os links. */
export async function POST(req:Request){
  const secret=configuredWebhookSecret(process.env.GROK_WEBHOOK_SECRET);
  if(!secret)return NextResponse.json({error:'Integração desativada: configure GROK_WEBHOOK_SECRET no servidor.'},{status:503});
  if(!webhookAuthorized(req.headers.get('authorization'),secret))
    return NextResponse.json({error:'Não autorizado.'},{status:401});
  if(Number(req.headers.get('content-length')||0)>40000)
    return NextResponse.json({error:'Corpo da atualização muito grande.'},{status:413});
  let body:z.infer<typeof schema>;
  try{
    const raw=await req.text();
    if(raw.length>40000)return NextResponse.json({error:'Corpo muito grande.'},{status:413});
    body=schema.parse(JSON.parse(raw));
  }catch{
    return NextResponse.json({error:'Payload inválido. Consulte a documentação da integração Grok.'},{status:400});
  }
  if(!isValidDate(body.observation.observed_on)||
    (body.monitor_until&&!isValidDate(body.monitor_until)))
    return NextResponse.json({error:'Data inválida.'},{status:400});
  if(body.offer.landing_url && !normalizeOfferUrl(body.offer.landing_url))
    return NextResponse.json({error:'URL da oferta inválida.'},{status:400});
  if(body.offer.ad_library_url && !/^https:\/\/([a-z]+\.)?facebook\.com\/ads\/library\//i.test(body.offer.ad_library_url))
    return NextResponse.json({error:'Link da Biblioteca Meta inválido.'},{status:400});
  let admin:ReturnType<typeof serviceClient>;
  try{admin=serviceClient();}catch{return NextResponse.json({error:'Chave de serviço Supabase não configurada.'},{status:503});}
  const {data:account,error:accountError}=await admin.auth.admin.getUserById(body.user_id);
  if(accountError||!account.user)return NextResponse.json({error:'Usuário de destino inexistente.'},{status:404});

  let product:{id:string;user_id:string;notes:string;created_at:string}|null=null;
  if(body.product_id){
    const found=await admin.from('products').select('id,user_id,notes,created_at')
      .eq('id',body.product_id).eq('user_id',body.user_id).maybeSingle();
    if(found.error)return NextResponse.json({error:'Falha na busca da oferta.'},{status:500});
    product=found.data;
    if(!product)return NextResponse.json({error:'Oferta não encontrada para este usuário.'},{status:404});
  }else{
    const marker=body.source_key?'#grok-source:'+body.source_key:'';
    const match=marker?
      await admin.from('products').select('id,user_id,notes,created_at').eq('user_id',body.user_id)
        .ilike('notes','%'+marker+'%').limit(2):
      await admin.from('products').select('id,user_id,notes,created_at').eq('user_id',body.user_id)
        .eq('name',body.offer.name).limit(2);
    if(match.error)return NextResponse.json({error:'Falha ao verificar duplicidade da oferta.'},{status:500});
    if((match.data||[]).length>1)return NextResponse.json({error:'Ofertas duplicadas: envie product_id para escolher o dossiê.'},{status:409});
    product=match.data?.[0]||null;
  }
  let created=false;
  if(!product){
    const landing=body.offer.landing_url?normalizeOfferUrl(body.offer.landing_url):'';
    const {data,error}=await admin.from('products').insert({
      user_id:body.user_id,name:body.offer.name,niche:body.offer.niche||'',
      product_type:'digital',country:body.offer.country||'A investigar',
      language:body.offer.language||'pt-BR',currency:body.offer.currency||'BRL',
      sale_price:body.offer.sale_price??null,landing_url:landing,
      ad_library_url:body.offer.ad_library_url?repairMetaLibraryLink(body.offer.ad_library_url):'',
      promise:body.offer.promise||'',target_audience:body.offer.target_audience||'',
      format:body.offer.format||'ebook',status:'researching',weekly_pick:false,
      notes:['Pesquisa Grok · evidências ainda não verificadas.',
        body.source_key?'#grok-source:'+body.source_key:''].filter(Boolean).join('\n'),
    }).select('id,user_id,notes,created_at').single();
    if(error||!data){
      console.error('Grok insert product',error);
      return NextResponse.json({error:'Não foi possível criar oferta. Confira as colunas do schema.'},{status:500});
    }
    product=data;created=true;
  }else{
    const patch:Record<string,unknown>={};
    for(const key of ['name','niche','country','language','currency','sale_price','format','promise','target_audience'] as const){
      if(body.offer[key]!==undefined)patch[key]=body.offer[key];
    }
    if(body.offer.landing_url!==undefined)patch.landing_url=body.offer.landing_url?normalizeOfferUrl(body.offer.landing_url):'';
    if(body.offer.ad_library_url!==undefined)patch.ad_library_url=body.offer.ad_library_url?repairMetaLibraryLink(body.offer.ad_library_url):'';
    if(body.source_key&&!product.notes.includes('#grok-source:'))
      patch.notes=[product.notes,'#grok-source:'+body.source_key].filter(Boolean).join('\n');
    if(Object.keys(patch).length){
      const changed=await admin.from('products').update(patch).eq('id',product.id).eq('user_id',body.user_id);
      if(changed.error)return NextResponse.json({error:'Falha ao atualizar a oferta.'},{status:500});
    }
  }
  const historyQuery=await admin.from('analyses').select('*').eq('product_id',product.id).eq('user_id',body.user_id)
    .eq('model','Grok Monitor').eq('kind','product').order('created_at',{ascending:false}).limit(120);
  if(historyQuery.error)return NextResponse.json({error:'Falha ao consultar histórico.'},{status:500});
  const prior=(historyQuery.data||[]) as Analysis[];
  const previous=prior.find(a=>researchMonitor(a)?.event_id===body.event_id);
  if(previous)return NextResponse.json({
    ok:true,duplicate:true,product_id:product.id,update_id:previous.id,message:'Evento já registrado. Nenhuma nova auditoria executada.',
  });
  const previousUntil=prior.map(researchMonitor).find(x=>x?.monitor_until)?.monitor_until;
  const monitorUntil=body.monitor_until||previousUntil||plusSevenDays(body.observation.observed_on);
  const observationMeta={
    event_id:body.event_id,observed_on:body.observation.observed_on,
    monitor_until:monitorUntil,source_key:body.source_key||'',
    changes:body.observation.changes,
    evidence_urls:body.observation.evidence_urls,
    funnel_hypothesis:body.observation.funnel_hypothesis,
  };
  const log=await admin.from('analyses').insert({
    user_id:body.user_id,product_id:product.id,ad_id:null,
    kind:'product',score:0,confidence:'low',model:'Grok Monitor',
    summary:body.observation.summary,strengths:[],risks:[],opportunities:[],
    recommendation:'Informação do Grok registrada; aguardando análise independente da OpenAI.',
    breakdown:{research_monitor:observationMeta},
  }).select('id').single();
  if(log.error||!log.data)return NextResponse.json({error:'Oferta salva, mas não foi possível registrar a atualização.'},{status:500});

  const adWarnings:string[]=[];
  let linkedAds=0;
  for(const row of body.observation.ads){
    let parsed:ReturnType<typeof parseMetaLibraryUrl>;
    try{parsed=parseMetaLibraryUrl(row.url);}catch{adWarnings.push('Link de anúncio inválido: '+row.url.slice(0,80));continue;}
    if(!parsed.adId){adWarnings.push('Busca sem ID individual: registre o link como evidência, não como anúncio confirmado.');continue;}
    const lookup=await admin.from('ads').select('id').eq('user_id',body.user_id).eq('product_id',product.id)
      .eq('meta_library_id',parsed.adId).maybeSingle();
    if(lookup.error){adWarnings.push('Falha ao localizar anúncio '+parsed.adId);continue;}
    let adId=lookup.data?.id;
    const base={name:(row.name||'Anúncio Meta '+parsed.adId).slice(0,150),
      advertiser:row.advertiser,ad_url:parsed.normalizedUrl,meta_library_id:parsed.adId,
      observed_active:row.status,status_source:row.status==='unknown'?'unknown':'manual',
      started_at:row.started_at,started_at_source:row.started_at?'manual':'unknown'};
    if(adId){
      const update=await admin.from('ads').update(base).eq('id',adId).eq('user_id',body.user_id);
      if(update.error){adWarnings.push('Falha ao atualizar anúncio '+parsed.adId);continue;}
    }else{
      const insert=await admin.from('ads').insert({...base,user_id:body.user_id,product_id:product.id,
        platform:'meta',link_check_result:'not_checked',notes:'Registro recebido do Grok; validar na Meta.'})
        .select('id').single();
      if(insert.error||!insert.data){adWarnings.push('Falha ao cadastrar anúncio '+parsed.adId);continue;}
      adId=insert.data.id;
    }
    linkedAds++;
    const snapshot=await admin.from('ad_snapshots').insert({user_id:body.user_id,ad_id:adId,
      status:row.status,check_method:'manual',check_result:'manual',
      notes:('Relato Grok '+body.observation.observed_on+': '+(row.change||'Sem alteração descrita')+'. Não verificado automaticamente.').slice(0,2000)});
    if(snapshot.error)adWarnings.push('Não foi possível salvar histórico do anúncio '+parsed.adId);
  }
  let audit:Analysis|null=null;
  let auditError='';
  if(process.env.OPENAI_API_KEY){
    const result=await runOfferAnalysis({supabase:admin,userId:body.user_id,productId:product.id,locale:'pt-BR',audit:true});
    if(result.ok)audit=result.analysis;else auditError=result.error;
  }else auditError='OPENAI_API_KEY ainda não está configurada no servidor.';
  const logs=[{breakdown:{research_monitor:observationMeta}} as unknown as Analysis,...prior];
  const progress=researchProgress(logs,monitorUntil);
  let recommended=canRecommendTest(audit,progress);
  let statusUpdated=false;
  if(recommended){
    const updated=await admin.from('products').update({status:'ready'}).eq('id',product.id)
      .eq('user_id',body.user_id).eq('status','researching');
    if(updated.error){recommended=false;auditError=auditError||'Não foi possível marcar como pronta para revisão.';}
    else statusUpdated=true;
  }
  const decision=researchDecision(audit||undefined);
  return NextResponse.json({
    ok:true,created,product_id:product.id,update_id:log.data.id,
    research_until:monitorUntil,days_recorded:progress.days,
    eligible_for_test_review:recommended,status_updated:statusUpdated,
    next_step:recommended?'Revisar e autorizar teste (nenhum anúncio é publicado automaticamente)':
      audit?.verdict==='reject'?'Não testar; rever os bloqueios':audit?.verdict==='approve'?'Preparar ou observar até concluir validação':'Continuar observando e coletando provas',
    audit:audit?{id:audit.id,score:audit.score,verdict:audit.verdict,confidence:audit.confidence,
      recommendation:audit.recommendation,blockers:audit.blockers,funnel:decision?.funnel||'undecided',
      funnel_reason:decision?.funnel_reason||''}:null,
    ads_linked:linkedAds,ad_warnings:adWarnings,
    warning:auditError||null,
  },{headers:{'Cache-Control':'no-store'}});
}
