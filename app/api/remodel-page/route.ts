import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';
import {PAGE_PREFIX, type SalesPageDraft} from '@/lib/sales-page';
import type {Ad,Product} from '@/lib/types';
export const runtime='nodejs';

const requestSchema=z.object({
  productId:z.string().uuid(),
  competitorCopy:z.string().max(7000).default(''),
  differentiation:z.string().max(2500).default(''),
  actualContents:z.string().max(3500).default(''),
  tone:z.enum(['direta','profissional','acolhedora']).default('direta')
}).strict();
const field=(max:number)=>z.string().trim().min(1).max(max);
const draftSchema=z.object({
  brand:field(110),eyebrow:field(120),headline:field(180),subheadline:field(480),
  painTitle:field(150),painBody:field(550),
  benefitsTitle:field(150),benefits:z.array(field(190)).min(3).max(5),
  offerTitle:field(150),includes:z.array(field(190)).min(2).max(6),
  stepsTitle:field(150),steps:z.array(field(160)).min(3).max(4),
  faqTitle:field(150),faq:z.array(z.object({question:field(160),answer:field(350)})).min(2).max(4),
  ctaText:field(75),finalTitle:field(150),finalBody:field(400)
});
const str={type:'string'} as const;
const jsonSchema={
  type:'object',additionalProperties:false,
  required:['brand','eyebrow','headline','subheadline','painTitle','painBody','benefitsTitle',
    'benefits','offerTitle','includes','stepsTitle','steps','faqTitle','faq','ctaText','finalTitle','finalBody'],
  properties:{
    brand:str,eyebrow:str,headline:str,subheadline:str,painTitle:str,painBody:str,
    benefitsTitle:str,benefits:{type:'array',items:str},
    offerTitle:str,includes:{type:'array',items:str},
    stepsTitle:str,steps:{type:'array',items:str},
    faqTitle:str,faq:{type:'array',items:{
      type:'object',additionalProperties:false,required:['question','answer'],
      properties:{question:str,answer:str}
    }},
    ctaText:str,finalTitle:str,finalBody:str
  }
};
const limits=new Map<string,{count:number;expire:number}>();
function canCall(userId:string){
  const now=Date.now();
  const state=limits.get(userId);
  if(!state||now>state.expire){limits.set(userId,{count:1,expire:now+20*60*1000});return true;}
  if(state.count>=5)return false;
  state.count++;
  return true;
}
export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({
    error:'A função de remodelagem com IA exige OPENAI_API_KEY no servidor. Use o modelo manual se a chave não estiver configurada.'
  },{status:503});
  if(Number(req.headers.get('content-length')||0)>18000)return NextResponse.json({error:'Texto enviado grande demais.'},{status:413});
  let input:z.infer<typeof requestSchema>;
  try{input=requestSchema.parse(await req.json());}
  catch{return NextResponse.json({error:'Revise o produto e os campos da copy de referência.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:'Sessão expirada. Faça login novamente.'},{status:401});
  if(!canCall(user.id))return NextResponse.json({error:'Limite de 5 gerações em 20 minutos atingido. Revise seu rascunho.'},{status:429});
  const {data:product,error:pError}=await supabase.from('products')
    .select('*').eq('id',input.productId).eq('user_id',user.id).single();
  if(pError||!product)return NextResponse.json({error:'Oferta não encontrada nesta conta.'},{status:404});
  const {data:adData,error:aError}=await supabase.from('ads')
    .select('*').eq('user_id',user.id).eq('product_id',input.productId).limit(8);
  if(aError)return NextResponse.json({error:'Não foi possível carregar os anúncios de referência.'},{status:500});
  const p=product as Product;
  const ads=(adData||[]) as Ad[];
  const referenceData=ads.map(ad=>({hook:ad.hook.slice(0,400),copy:ad.ad_copy.slice(0,1200),
    cta:ad.cta.slice(0,160),platform:ad.platform}));
  const context={
    product:{name:p.name,niche:p.niche,country:p.country,language:p.language,currency:p.currency,
      reference_price:p.sale_price,reference_promise:p.promise.slice(0,1000),
      audience:p.target_audience.slice(0,500),
      research_page_url:p.landing_url,
      notes:p.notes.replace(/^#[^\n]+$/gm,'').slice(0,1500)},
    competitor_copy_pasted:input.competitorCopy,
    competitor_ads_saved:referenceData,
    original_product_differentiation:input.differentiation,
    actual_product_contents_that_exist:input.actualContents,
    tone:input.tone,
    source:'Reference material supplied by the account owner; not verified or licensed for reuse'
  };
  const instructions=[
    'Você é um copywriter sênior que trabalha com funis de TRÁFEGO DIRETO, checkout e páginas mobile-first para o mercado brasileiro.',
    'Seu trabalho é criar uma página de vendas NOVA, autoral e original para um NOVO produto, a partir de uma análise dos argumentos e dores de concorrentes.',
    'Não reescreva frases da concorrência por sinônimos. Extraia apenas ideias, dúvidas do público, objeções e diferenciais gerais e crie sua própria arquitetura de persuasão.',
    'Não copie slogans reconhecíveis, parágrafos, títulos distintivos, nomes de marca, imagens, depoimentos ou elementos criativos de concorrentes.',
    'Crie uma NOVA marca/nome para a oferta original. O campo product.name descreve a REFERÊNCIA, não deve ser tratado como a marca nova definitiva.',
    'O produto ORIGINAL do cliente pode não estar pronto. Os dados da oferta de referência são apenas referência, NÃO evidência de que já produzimos os arquivos.',
    'Liste em "includes" somente entregáveis que o usuário tenha confirmado no campo actual_product_contents_that_exist. Se estiver vazio, coloque itens claros de PLACEHOLDER como "Descreva aqui o conteúdo que será criado e entregue", sem inventar módulos, quantidades ou bônus.',
    'Não invente avaliações, números de estudantes, percentuais de resultado, certificações, benefícios clínicos, depoimentos, escassez, prazo, desconto, garantia ou prova social.',
    'Não afirme que viu a página no URL. Não houve navegação externa: trate a URL apenas como referência.',
    'O objetivo é copy original de conversão: na dobra inicial use dor e resultado realista, clareza de oferta e CTA; frases curtas, seções escaneáveis, bullets práticos e FAQ realista.',
    'Se o nicho for saúde/psicologia, evite alegações de cura, tratamento garantido ou diagnóstico. Indique que a utilização clínica depende de profissional qualificado.',
    'Não prometa disponibilidade, produto finalizado nem entrega instantânea se não estiver comprovado.',
    'A página é um RASCUNHO para revisão humana e será montada em um template responsivo independente.',
    'Não inclua URL, HTML, Markdown ou scripts em campos de texto. Retorne somente JSON no esquema solicitado.',
    'Sempre em pt-BR e tom selecionado pelo usuário. Limite títulos e parágrafos para leitura confortável em 320px.'
  ].join(' ');
  const model=process.env.PAGE_REMODEL_MODEL||process.env.OPENAI_MODEL||'gpt-4.1-mini';
  let response:Response;
  try{
    response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model,store:false,instructions,
        input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(context).slice(0,21000)}]}],
        text:{format:{type:'json_schema',name:'original_sales_landing',strict:true,schema:jsonSchema}},
        max_output_tokens:2900}),signal:AbortSignal.timeout(60000)});
  }catch{return NextResponse.json({error:'A geração demorou demais ou a API ficou indisponível.'},{status:504});}
  if(!response.ok){
    console.error('page-model status',response.status,(await response.text()).slice(0,220));
    return NextResponse.json({error:response.status===429?'Limite de IA atingido.':
      'Falha na IA. Verifique chave, créditos e modelo configurado.'},{status:502});
  }
  let parsed:unknown;
  try{
    const result=await response.json();
    const output=(result.output||[]).flatMap((v:{content?:{type?:string;text?:string}[]})=>v.content||[])
      .find((c:{type?:string})=>c.type==='output_text');
    parsed=JSON.parse(output?.text||'{}');
  }catch{return NextResponse.json({error:'A IA não retornou o rascunho completo.'},{status:502});}
  const checked=draftSchema.safeParse(parsed);
  if(!checked.success)return NextResponse.json({error:'A IA retornou um formato incompleto. Tente gerar novamente.'},{status:502});
  const draft:SalesPageDraft={...checked.data,accent:'#12b886',imageUrl:''};
  return NextResponse.json({
    draft,source:'IA gerou texto original usando referências informadas, sem visitar links',
    model
  },{headers:{'Cache-Control':'no-store'}});
}
