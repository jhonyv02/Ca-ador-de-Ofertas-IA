/** Converte domínios sem protocolo em links HTTPS, sem alterar outros URLs do sistema. */
export function normalizeOfferUrl(raw:string):string {
  const value=raw.trim();
  if(!value || /\s/.test(value) || value.includes('\\'))return '';
  if(!/^https?:\/\//i.test(value) && /^[a-z][a-z\d+.-]*:/i.test(value))return '';
  const candidate=/^https?:\/\//i.test(value)?value:'https://'+value.replace(/^\/\//,'');
  try {
    const url=new URL(candidate);
    const labels=url.hostname.split('.');
    if(!['https:','http:'].includes(url.protocol) || url.username || url.password ||
      labels.length<2 || labels.some(part=>!part || !/^[a-z\d-]+$/i.test(part)) ||
      labels[labels.length-1].length<2)return '';
    return url.toString();
  }catch{return '';}
}
/** Pesquisa pública na Meta: não comprova a existência ou atividade dos anúncios. */
export function metaAdsLibraryUrl(term:string):string {
  const query=term.trim();
  if(!query)return '';
  const params=new URLSearchParams({active_status:'active',ad_type:'all',country:'ALL',
    q:query,search_type:'keyword_unordered'});
  return 'https://www.facebook.com/ads/library/?'+params.toString();
}
/** Remove https:// e rastreadores da consulta; pode restringir ao domínio. */
export function metaSearchUrlForWebsite(raw:string,mode:'path'|'domain'='path'):string {
  const normalized=normalizeOfferUrl(raw);
  if(!normalized)return '';
  const url=new URL(normalized);
  const host=url.hostname.replace(/^www\./i,'');
  return metaAdsLibraryUrl(host+(mode==='path'&&url.pathname!=='/'?url.pathname:''));
}
