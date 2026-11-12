import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { parseMetaLibraryUrl, parseSpecificAdFromHtml, type MetaInspection } from '@/lib/meta-library';

export const runtime='nodejs';
const limit=new Map<string,{count:number,reset:number}>();
const LIMIT_PER_MINUTE=12;

/** Não segue redirects e só consulta URL FIXA da Meta, sem parâmetros arbitrários: proteção SSRF. */
export async function POST(request:NextRequest){
  const supabase=await serverClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:'Faça login para consultar anúncios.'},{status:401});
  let body:{url?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({error:'Informe o link da Meta.'},{status:400});}
  if(typeof body?.url!=='string'||body.url.length>2048)return NextResponse.json({error:'Link inválido ou muito longo.'},{status:400});
  let parsed:ReturnType<typeof parseMetaLibraryUrl>;
  try{parsed=parseMetaLibraryUrl(body.url);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Link inválido.'},{status:400});}
  const now=Date.now();
  if(limit.size>5000){for(const [k,v] of limit)if(v.reset<now)limit.delete(k);}
  const count=limit.get(user.id);
  if(count&&count.reset>now&&count.count>=LIMIT_PER_MINUTE)return NextResponse.json({error:'Muitas consultas. Tente novamente em um minuto.'},{status:429});
  limit.set(user.id,{count:count&&count.reset>now?count.count+1:1,reset:count&&count.reset>now?count.reset:now+60000});
  const base:MetaInspection={adId:parsed.adId,normalizedUrl:parsed.normalizedUrl,checkedAt:new Date().toISOString(),
    result:'unavailable',status:'unknown',startedAt:null,source:'url_only',message:''};
  if(!parsed.adId)return NextResponse.json({...base,message:'Este link é de busca ou página, não de um anúncio individual (ID ausente). Abra o anúncio e copie seu link específico ou preencha os dados manualmente.'});
  try{
    const url=`https://www.facebook.com/ads/library/?id=${parsed.adId}`;
    const res=await fetch(url,{method:'GET',cache:'no-store',redirect:'manual',
      headers:{'Accept':'text/html','User-Agent':'Mozilla/5.0 (compatible; CaçadorDeOfertas/1.0; ad-research)'},
      signal:AbortSignal.timeout(6500)});
    if(!res.ok||res.status>=300||!res.headers.get('content-type')?.includes('text/html')){
      return NextResponse.json({...base,result:'partial',message:'Encontramos o ID do anúncio, mas a Meta não disponibilizou os dados públicos para esta consulta. Complete a data, status, copy e criativo manualmente.'});
    }
    const length=Number(res.headers.get('content-length')||0);
    if(length>1_500_000)return NextResponse.json({...base,result:'partial',message:'A página excedeu o limite de leitura. Informe os detalhes manualmente.'});
    // Streaming com limite real de bytes: não confia somente no Content-Length.
    const reader=res.body?.getReader();if(!reader)throw new Error('Sem conteúdo');
    const chunks:Uint8Array[]=[];let total=0;
    while(true){const {done,value}=await reader.read();if(done)break;
      total+=value.byteLength;if(total>1_500_000){await reader.cancel();break;}chunks.push(value);
    }
    if(total>1_500_000)return NextResponse.json({...base,result:'partial',message:'A página é muito grande para extração segura. Complete os campos manualmente.'});
    const html=new TextDecoder().decode(Buffer.concat(chunks.map(v=>Buffer.from(v))));
    const found=parseSpecificAdFromHtml(html,parsed.adId);
    if(!found||(!found.startedAt&&found.status==='unknown'))return NextResponse.json({...base,result:'partial',message:'O link foi reconhecido, mas os dados deste anúncio não apareceram de forma verificável. Complete os campos manualmente (sem presumir que ele esteja inativo).'});
    const full=!!found.startedAt&&found.status!=='unknown';
    return NextResponse.json({...base,result:full?'verified':'partial',source:'public_page',startedAt:found.startedAt,status:found.status,
      message:full?'Dados públicos identificados para este ID. Confira no original antes de decidir.':'Encontrei parte dos dados públicos. Complete manualmente o que estiver faltando.'});
  }catch{
    return NextResponse.json({...base,result:'partial',message:'Não foi possível acessar o conteúdo público da Meta neste momento. O ID do anúncio foi identificado; adicione os demais dados manualmente.'});
  }
}
