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
  const en=text.match(/Started running on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if(en) return validDate(Number(en[3]),MONTHS[en[1].toLowerCase()]||0,Number(en[2]));
  const pt=text.match(/(?:Veicula[çc][ãa]o iniciada em|Come[çc]ou a ser veiculado em)\s+(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})/i);
  if(pt) return validDate(Number(pt[3]),MONTHS[pt[2].toLowerCase()]||0,Number(pt[1]));
  return null;
}
/** Nunca usa um texto de outro anúncio da mesma lista como evidência. */
export function parseSpecificAdFromHtml(html:string, adId:string): {startedAt:string|null; status:LibraryAdStatus}|null {
  const txt=normalizeVisibleText(html);
  const marker=new RegExp(`(?:Library ID|Identifica[çc][ãa]o da biblioteca)\\s*:?\\s*${adId}(?!\\d)`,'i');
  const hit=marker.exec(txt);
  if(!hit)return null;
  const following=txt.slice(hit.index+hit[0].length);
  const nextAd=following.search(/(?:Library ID|Identifica[çc][ãa]o da biblioteca)\s*:?\s*\d{7,25}/i);
  // Limita-se ao conteúdo EXATO do criativo. Não usa status globais da página.
  const record=following.slice(0,Math.min(nextAd>=0?nextAd:900,900));
  const startedAt=extractStartDate(record);
  // O status só é aceito se ocorrer muito perto do próprio ID (nunca do filtro global).
  const before=txt.slice(Math.max(0,hit.index-25),hit.index).trim();
  const status:LibraryAdStatus=/(?:Inactive|Inativo)\s*$/i.test(before)?'inactive':
    /(?:Active|Ativo)\s*$/i.test(before)?'active':'unknown';
  return {startedAt,status};
}

export function fallbackInspection(raw:string, message:string):MetaInspection {
  const {adId,normalizedUrl}=parseMetaLibraryUrl(raw);
  return {adId,normalizedUrl,checkedAt:new Date().toISOString(),result:adId?'partial':'unavailable',
    status:'unknown',startedAt:null,message,source:'url_only'};
}
