/** A interface permite visualizar apps/SaaS legados; envio do robô exige classificação explícita. */
export function isMiniApp(product:{product_type?:string|null;format?:string|null}){
  return product.product_type==='saas'||product.format==='app';
}
export function researchLaneError(lane:'offers'|'mini_apps',input:{sourceKey?:string;format?:string;hasMiniData:boolean}):string|null{
  if(lane==='mini_apps'){
    if(!input.sourceKey?.startsWith('mini-')||input.format!=='app'||!input.hasMiniData)
      return 'Mini apps exigem source_key mini-..., format app e observation.mini_app.';
  }else if(input.sourceKey?.startsWith('mini-')||input.format==='app'||input.hasMiniData)
    return 'Envie mini apps ao endpoint /api/grok/mini-apps.';
  return null;
}
