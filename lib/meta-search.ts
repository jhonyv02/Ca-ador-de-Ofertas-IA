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
  const params=new URLSearchParams({active_status:'all',ad_type:'all',country:'ALL',
    q:query,search_type:'keyword_unordered'});
  return 'https://www.facebook.com/ads/library/?'+params.toString();
}
/** Remove https:// e rastreadores da consulta; pode restringir ao domínio. */
export function metaSearchUrlForWebsite(raw:string,mode:'path'|'domain'='domain'):string {
  const normalized=normalizeOfferUrl(raw);
  if(!normalized)return '';
  const url=new URL(normalized);
  const host=url.hostname.replace(/^www\./i,'');
  return metaAdsLibraryUrl(host+(mode==='path'&&url.pathname!=='/'?url.pathname:''));
}

/** Corrige filtros de pesquisa antigos. Links com ID exato continuam apontando para o anúncio. */
export function repairMetaLibraryLink(raw:string):string {
  try {
    const url=new URL(raw.trim());
    if(url.protocol!=='https:' && url.protocol!=='http:')return '';
    if(!['facebook.com','www.facebook.com','m.facebook.com','business.facebook.com'].includes(url.hostname.toLowerCase()) ||
      !/^\/ads\/library\/?$/.test(url.pathname))return url.toString();
    const id=url.searchParams.get('id');
    if(id && /^\d{7,25}$/.test(id))return 'https://www.facebook.com/ads/library/?id='+id;
    const page=url.searchParams.get('view_all_page_id');
    if(page && /^\d{1,25}$/.test(page)) {
      const params=new URLSearchParams({active_status:'all',ad_type:'all',country:'ALL',view_all_page_id:page});
      return 'https://www.facebook.com/ads/library/?'+params.toString();
    }
    const q=url.searchParams.get('q');
    if(q){
      const full=normalizeOfferUrl(q);
      const domain=full?new URL(full).hostname.replace(/^www\./i,''):q.trim();
      return metaAdsLibraryUrl(domain);
    }
    return 'https://www.facebook.com/ads/library/';
  } catch {return '';}
}
