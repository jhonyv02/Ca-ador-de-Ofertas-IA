import {NextRequest,NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {parseMetaLibraryUrl,parseSpecificAdFromHtml,type MetaInspection} from '@/lib/meta-library';

export const runtime='nodejs';
const limit=new Map<string,{count:number,reset:number}>();
const LIMIT_PER_MINUTE=12;
const MAX_BYTES=1_500_000;
const TIMEOUT_MS=6500;

/**
 * Consulta o HTML público do link (quando disponível), sem ignorar login,
 * captchas, bloqueios de acesso ou restrições de uso da Meta.
 * Não conclui que um anúncio está inativo só porque não foi possível consultá-lo.
 */
export async function POST(request:NextRequest) {
  const supabase=await serverClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:'Faça login para consultar anúncios.'},{status:401});

  let body:{url?:unknown};
  try {body=await request.json();}catch {return NextResponse.json({error:'Informe um link da Biblioteca da Meta.'},{status:400});}
  if(typeof body?.url!=='string'||body.url.length>2048)
    return NextResponse.json({error:'O link informado é inválido ou muito longo.'},{status:400});

  let parsed:ReturnType<typeof parseMetaLibraryUrl>;
  try {parsed=parseMetaLibraryUrl(body.url);}
  catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'Link inválido.'},{status:400});}

  const now=Date.now();
  if(limit.size>5000)for(const [id,state] of limit)if(state.reset<now)limit.delete(id);
  const count=limit.get(user.id);
  if(count&&count.reset>now&&count.count>=LIMIT_PER_MINUTE)
    return NextResponse.json({error:'Limite de consultas por minuto atingido. Tente novamente em breve.'},{status:429});
  limit.set(user.id,{count:count&&count.reset>now?count.count+1:1,reset:count&&count.reset>now?count.reset:now+60000});

  const base:MetaInspection={
    adId:parsed.adId,normalizedUrl:parsed.normalizedUrl,checkedAt:new Date().toISOString(),
    result:'partial',status:'unknown',startedAt:null,source:'url_only',
    reason:'not_checked',httpStatus:null,message:'',
  };
  const fallback=(reason:NonNullable<MetaInspection['reason']>,message:string,httpStatus:number|null=null)=>
    NextResponse.json({...base,reason,message,httpStatus});

  if(!parsed.adId)return fallback('no_ad_id',
    'O link é de busca/página da Biblioteca, sem ID de um anúncio individual. Abra um cartão específico e use o link que contém ?id=.');

  try {
    // Apenas domínio HTTPS e caminho definidos aqui. A entrada do usuário só contribui com ID numérico.
    const url='https://www.facebook.com/ads/library/?id='+parsed.adId;
    const response=await fetch(url,{
      method:'GET',cache:'no-store',redirect:'manual',
      headers:{Accept:'text/html','User-Agent':'CacadorDeOfertasIA/1.0 (+public-ad-research)'},
      signal:AbortSignal.timeout(TIMEOUT_MS)
    });

    if([401,403,429].includes(response.status))return fallback('meta_restricted',
      'A Meta recusou a consulta automatizada (HTTP '+response.status+'). Isso NÃO significa que o anúncio foi excluído. Você pode copiar o texto visível do cartão e importar os dados.',response.status);
    if(response.status>=300&&response.status<400)return fallback('redirected',
      'A Meta redirecionou a requisição (HTTP '+response.status+'), possivelmente para outra página ou login. Não foi possível verificar os dados automaticamente.',response.status);
    if(!response.ok)return fallback('unexpected_response',
      'A Meta respondeu com HTTP '+response.status+'. O anúncio não foi confirmado nem classificado como inativo.',response.status);
    if(!response.headers.get('content-type')?.toLowerCase().includes('text/html'))return fallback('unexpected_response',
      'A Meta não retornou uma página HTML legível. Os dados não foram confirmados.',response.status);

    const length=Number(response.headers.get('content-length')||0);
    if(length>MAX_BYTES)return fallback('too_large',
      'A resposta da Meta ultrapassou o limite seguro de leitura. Use a opção de colar texto visível do anúncio.',response.status);

    const reader=response.body?.getReader();
    if(!reader)return fallback('unexpected_response','A página foi retornada sem conteúdo legível.',response.status);
    const chunks:Uint8Array[]=[];let total=0;
    while(true) {
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>MAX_BYTES){await reader.cancel();return fallback('too_large',
        'O HTML da Meta é muito grande para a leitura limitada do sistema. Use a opção de colar texto visível.',response.status);}
      chunks.push(value);
    }
    const html=new TextDecoder().decode(Buffer.concat(chunks.map(v=>Buffer.from(v))));
    const extracted=parseSpecificAdFromHtml(html,parsed.adId);
    if(!extracted||(!extracted.startedAt&&extracted.status==='unknown'))return fallback('not_rendered',
      'A Meta respondeu, mas não enviou o cartão deste anúncio como texto HTML verificável. A página pode carregar os dados por JavaScript. O ID do link é válido como formato, mas data e status NÃO foram confirmados.',response.status);

    const full=!!extracted.startedAt&&extracted.status!=='unknown';
    return NextResponse.json({...base,result:full?'verified':'partial',reason:full?'found_full':'found_partial',
      source:'public_page',startedAt:extracted.startedAt,status:extracted.status,httpStatus:response.status,
      message:full?'Data e status visíveis foram encontrados para este ID.':'A Meta mostrou apenas parte dos dados verificáveis deste anúncio.'});
  } catch(e) {
    const timeout=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError');
    return fallback(timeout?'timeout':'network_error',timeout?
      'A consulta à Meta ultrapassou o limite de tempo. Isso não indica que o anúncio está inativo.':
      'Não foi possível completar a conexão Hostinger → Meta. Não é possível determinar o status deste anúncio.');
  }
}
