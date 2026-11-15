import {NextResponse} from 'next/server';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';

export const runtime='nodejs';
const requestSchema=z.object({
  productId:z.string().uuid(),
  kind:z.enum(['hero','preview','gallery']),
  slot:z.number().int().min(0).max(14).optional(),
  contents:z.string().max(1800).default(''),
  label:z.string().max(130).default('')
}).strict();
const hits=new Map<string,{count:number;expires:number}>();
function allow(userId:string){
  const now=Date.now();
  const saved=hits.get(userId);
  if(!saved||now>saved.expires){hits.set(userId,{count:1,expires:now+20*60*1000});return true;}
  if(saved.count>=12)return false;
  saved.count++;return true;
}
export async function POST(req:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({
    error:'A geração de imagens requer OPENAI_API_KEY configurada na Hostinger.'
  },{status:503});
  if(Number(req.headers.get('content-length')||0)>4000)
    return NextResponse.json({error:'Dados grandes demais.'},{status:413});
  let body:z.infer<typeof requestSchema>;
  try{body=requestSchema.parse(await req.json());}
  catch{return NextResponse.json({error:'Confira os dados da imagem.'},{status:400});}
  const supabase=await serverClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:'Faça login novamente.'},{status:401});
  const {data:product,error:pError}=await supabase.from('products')
    .select('id,name,niche,promise').eq('id',body.productId).eq('user_id',user.id).single();
  if(pError||!product)return NextResponse.json({error:'Produto não encontrado nesta conta.'},{status:404});
  if(!allow(user.id))return NextResponse.json({
    error:'Limite de 12 imagens em 20 minutos. Cada geração usa créditos da API.'
  },{status:429});
  const themes=[
    'premium digital product bundle on a bright studio tabletop',
    'digital workbook spread with abstract diagram pages',
    'professional bound guide shown from a three-quarter angle',
    'smartphone screen with a clean abstract learning dashboard',
    'tablet and printable materials organized side-by-side',
    'set of illustrative learning cards floating on a soft background',
    'neat collection of PDF-style printable worksheets',
    'digital checklist notebook with minimalist graphic elements',
    'modular resource library displayed on a tablet and laptop',
    'premium collection of printable educational sheets',
    'elegant book and four separate digital resources in perspective',
    'overhead presentation of guide sheets and notebook',
    'side-view tablet mockup with stylized content panels',
    'organized boxed kit concept with booklet and cards',
    'complete visual summary of a digital material collection'
  ];
  const variation=body.kind==='gallery'?
    'COMPOSITION '+String((body.slot??0)+1)+': '+themes[body.slot??0]:
    body.kind==='hero'?'Central hero product kit in 3D with generous margins':
    'Detail-oriented editorial close-up of illustrative materials';
  const prompt=[
    'Create one entirely ORIGINAL, premium 3D product presentation image for a mobile-first digital product sales page.',
    'Studio product photography illustration, sophisticated modern editorial art direction, clean shadows, contrasting background, attention to realistic paper and device textures.',
    variation,
    'PRODUCT TOPIC: '+product.niche.slice(0,90)+'. '+product.promise.slice(0,300),
    body.contents?'CONFIRMED EXISTING MATERIAL DESCRIPTION: '+body.contents.slice(0,1200):'Only conceptual product visual; do not depict specific finished pages as factual samples.',
    body.label?'DESIGN IDEA: '+body.label:'Minimal elegant editorial composition.',
    'Avoid paragraphs, tiny illegible text, watermark, logos, real company names, faces, social proof, testimonials, claimed statistics, prices or guarantees.',
    'No competitor branding, no copyrighted character depictions. Use only generic invented graphical elements.',
    'It is a visual mockup / conceptual illustration, not evidence that exact files or pages are included.',
    'Use soft shadows and a consistent refined palette. No printed paragraphs or fake testimonials.'
  ].join('\n');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),95000);
  let response:Response;
  try{
    response=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',
        prompt,n:1,size:'1024x1024',quality:'medium',output_format:'webp'}),
      signal:controller.signal
    });
  }catch{return NextResponse.json({error:'A API de imagens não respondeu. Tente novamente.'},{status:502});}
  finally{clearTimeout(timer);}
  if(!response.ok){
    const raw=await response.text();
    return NextResponse.json({error:response.status===429?
      'Limite ou saldo da API de imagens atingido. Confira seu provedor.':
      'A API de imagens retornou HTTP '+response.status+'. '+raw.slice(0,170)
    },{status:502});
  }
  const result=await response.json();
  const base64=result?.data?.[0]?.b64_json;
  if(typeof base64!=='string'||!base64)
    return NextResponse.json({error:'A IA não retornou uma imagem utilizável.'},{status:502});
  const bytes=Buffer.from(base64,'base64');
  if(bytes.length===0||bytes.length>5*1024*1024)
    return NextResponse.json({error:'A imagem ultrapassou o limite do armazenamento.'},{status:502});
  const path=user.id+'/'+product.id+'/'+crypto.randomUUID()+'.webp';
  const {error:uploadError}=await supabase.storage.from('sales-page-assets')
    .upload(path,bytes,{contentType:'image/webp',upsert:false,cacheControl:'3600'});
  if(uploadError)return NextResponse.json({error:'Imagem gerada, mas não foi salva. Configure o bucket sales-page-assets no Supabase do Caçador: '+uploadError.message},{status:500});
  const {data:link}=supabase.storage.from('sales-page-assets').getPublicUrl(path);
  return NextResponse.json({url:link.publicUrl,kind:body.kind,
    note:'Mockup criado por IA; não representa fotografia ou prova da entrega real.',
    model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1'
  },{headers:{'Cache-Control':'no-store'}});
}
