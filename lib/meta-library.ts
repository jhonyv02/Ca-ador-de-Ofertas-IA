/** Consultas conservadoras à página pública. Não tenta contornar login, captcha ou bloqueios. */
export type InspectionResult = 'verified' | 'partial' | 'unavailable';
export type LibraryAdStatus = 'active' | 'inactive' | 'unknown';
export type MetaInspection = {
  adId: string | null;
  normalizedUrl: string;
  checkedAt: string;
  result: InspectionResult;
  status: LibraryAdStatus;
  startedAt: string | null;
  message: string;
  source: 'public_page' | 'url_only';
  reason?: 'found_full' | 'found_partial' | 'no_ad_id' | 'meta_restricted' |
    'redirected' | 'unexpected_response' | 'too_large' | 'not_rendered' |
    'timeout' | 'network_error' | 'not_checked';
  httpStatus?: number | null;
};

const ALLOWED_HOSTS = new Set(['www.facebook.com','facebook.com','business.facebook.com','m.facebook.com']);
const MONTHS: Record<string,number> = {
  jan:1,january:1,fev:2,fevereiro:2,feb:2,february:2,mar:3,march:3,março:3,marco:3,
  apr:4,april:4,abr:4,abril:4,may:5,mai:5,maio:5,jun:6,june:6,junho:6,
  jul:7,july:7,julho:7,aug:8,august:8,ago:8,agosto:8,sep:9,sept:9,
  september:9,set:9,setembro:9,oct:10,october:10,out:10,outubro:10,
  nov:11,november:11,novembro:11,dec:12,december:12,dez:12,dezembro:12
};

export function parseMetaLibraryUrl(raw: string): { adId: string|null; normalizedUrl: string } {
  let u: URL;
  try { u=new URL(raw.trim()); } catch { throw new Error('Cole um link completo da Biblioteca de Anúncios da Meta.'); }
  if(u.protocol!=='https:' || !ALLOWED_HOSTS.has(u.hostname.toLowerCase()) ||
    !/^\/ads\/library\/?$/.test(u.pathname)){
    throw new Error('Este campo aceita somente links https://facebook.com/ads/library/ da Meta.');
  }
  const id=u.searchParams.get('id');
  // Um link de busca/página pode não ter ID do anúncio específico.
  const adId=id && /^\d{7,25}$/.test(id) ? id : null;
  const normalizedUrl=adId?`https://www.facebook.com/ads/library/?id=${adId}`:u.toString();
  return {adId,normalizedUrl};
}

function decodeHtml(s:string){
  return s.replace(/&(?:nbsp|amp|quot|apos|lt|gt|#(\d+)|#x([\da-f]+));/gi,(match,dec,hex)=>{
    if(dec||hex){const n=parseInt(dec||hex,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';}
    const entities:Record<string,string> = {'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    return entities[match.toLowerCase()]||' ';
  });
}
function normalizeVisibleText(html:string) {
  // Somente dados textuais VISÍVEIS e correspondentes ao ID pesquisado.
  return decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
}
function validDate(year:number,month:number,day:number): string|null {
  if(year<2010||year>new Date().getUTCFullYear()||month<1||month>12)return null;
  const d=new Date(Date.UTC(year,month-1,day));
  if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day||d.getTime()>Date.now())return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function extractStartDate(text:string): string|null {
  // Datas em formatos ingleses, brasileiros e espanhóis usados em cartões visíveis.
  const enMonthFirst=text.match(/(?:Started running on|Started on)\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if(enMonthFirst)return validDate(Number(enMonthFirst[3]),MONTHS[enMonthFirst[1].toLowerCase()]||0,Number(enMonthFirst[2]));
  const enDayFirst=text.match(/(?:Started running on|Started on)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  if(enDayFirst)return validDate(Number(enDayFirst[3]),MONTHS[enDayFirst[2].toLowerCase()]||0,Number(enDayFirst[1]));
  const pt=text.match(/(?:Veicula[çc][ãa]o iniciada em|Come[çc]ou a ser veiculado em|In[ií]cio da veicula[çc][ãa]o\s*:?)\s+(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})/i);
  if(pt)return validDate(Number(pt[3]),MONTHS[pt[2].toLowerCase()]||0,Number(pt[1]));
  const spanish=text.match(/(?:En circulaci[oó]n desde|Empez[oó] a circular el)\s+(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
  if(spanish){
    const meses:Record<string,number>={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
    return validDate(Number(spanish[3]),meses[spanish[2].toLowerCase()]||0,Number(spanish[1]));
  }
  return null;
}

const ID_MARKER=/(?:Library ID|Identifica[çc][ãa]o da biblioteca|ID da biblioteca|Identificador da biblioteca|ID de la biblioteca|Identificador de la biblioteca)\s*:?\s*(\d{7,25})(?!\d)/gi;

/**
 * Analisa apenas data e status junto ao ID exato de um cartão cujo TEXTO está visível.
 * Não busca informações em scripts, estado interno da Meta ou outro anúncio.
 * Útil também para texto copiado pelo usuário na Biblioteca.
 */
export function parseCopiedMetaCardText(raw:string,adId:string): {startedAt:string|null;status:LibraryAdStatus}|null {
  if(!/^\d{7,25}$/.test(adId)||!raw.trim())return null;
  const txt=decodeHtml(raw.replace(/\s+/g,' ').trim());
  const matches=Array.from(txt.matchAll(ID_MARKER));
  const index=matches.findIndex(m=>m[1]===adId);
  if(index<0)return null;
  const match=matches[index];
  const start=match.index!;
  const previous=index>0?matches[index-1].index!+matches[index-1][0].length:0;
  const next=index+1<matches.length?matches[index+1].index!:txt.length;
  const before=txt.slice(Math.max(previous,start-65),start).trim();
  const after=txt.slice(start+match[0].length,Math.min(next,start+match[0].length+850));

  // O status do cartão normalmente aparece imediatamente antes da identificação.
  const status:LibraryAdStatus=/(?:Inactive|Inativo|Inactivo|Inactif)\s*$/i.test(before)?'inactive':
    /(?:Active|Ativo|Activo|Actif|Aktiv)\s*$/i.test(before)?'active':'unknown';
  const startedAt=extractStartDate(after);
  return {startedAt,status};
}

/** Lê somente texto HTML visível, excluindo script/style. */
export function parseSpecificAdFromHtml(html:string,adId:string): {startedAt:string|null;status:LibraryAdStatus}|null {
  return parseCopiedMetaCardText(normalizeVisibleText(html),adId);
}

export function fallbackInspection(raw:string, message:string):MetaInspection {
  const {adId,normalizedUrl}=parseMetaLibraryUrl(raw);
  return {adId,normalizedUrl,checkedAt:new Date().toISOString(),result:adId?'partial':'unavailable',
    status:'unknown',startedAt:null,message,source:'url_only'};
}
