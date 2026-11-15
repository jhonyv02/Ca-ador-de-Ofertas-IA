import type {SalesPageDraft} from './sales-page';

export type VisualAsset={label:string;src:string;illustrative:boolean};
export const AUTO_VISUAL_LABELS=[
  'Mockup principal do produto',
  'Visão geral do kit',
  'Primeira prévia do conteúdo',
  'Segunda prévia do conteúdo',
  'Apresentação para celular',
  'Apresentação para tablet',
  'Material em folhas digitais',
  'Cartões do conteúdo',
  'Guia de utilização',
  'Organização dos materiais',
  'Biblioteca do produto',
  'Resumo visual do produto',
  'Demonstração de uso',
  'Conjunto de recursos',
  'Apresentação final do kit'
] as const;
const xml=(v:string)=>String(v||'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export const safeImageUrl=(v:unknown)=>{
  try{
    const u=new URL(String(v||'').trim());
    return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';
  }catch{return '';}
};
function mockSvg(n:number,brand:string,topic:string,theme:'clinic'|'agenda'){
  const sea=theme==='clinic';
  const primary=sea?'#238e83':'#142b4d',accent=sea?'#f3b68b':'#e5b853';
  const soft=sea?'#e8f7f3':'#f9f0d9',ink=sea?'#193e45':'#172940';
  const brandLabel=xml(brand.slice(0,33));
  const topicLabel=xml(topic.slice(0,43));
  const start='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="810" viewBox="0 0 1080 810" role="img" aria-label="Mockup ilustrativo">'+
    '<defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="'+soft+'"/><stop offset="1" stop-color="#ffffff"/></linearGradient>'+
    '<filter id="shadow"><feDropShadow dx="16" dy="23" stdDeviation="18" flood-opacity=".18"/></filter></defs>'+
    '<rect width="1080" height="810" rx="35" fill="url(#g)"/>'+
    '<circle cx="'+(n*91%870+100)+'" cy="112" r="240" fill="'+accent+'" opacity=".13"/>'+
    '<circle cx="970" cy="725" r="230" fill="'+primary+'" opacity=".11"/>';
  let shapes='';
  const variant=n%5;
  if(variant===0){
    shapes='<g filter="url(#shadow)" transform="translate(188 94) rotate(-7 320 300)">'+
      '<rect x="52" y="40" width="560" height="610" rx="20" fill="'+primary+'"/>'+
      '<rect x="76" y="62" width="510" height="560" rx="10" fill="'+soft+'"/>'+
      '<path d="M76 140H586" stroke="'+accent+'" stroke-width="13"/>'+
      '<rect x="135" y="238" width="392" height="215" rx="28" fill="'+primary+'" opacity=".11"/>'+
      '<circle cx="330" cy="328" r="89" fill="'+accent+'" opacity=".47"/>'+
      '<path d="M265 379L322 300L362 344L408 272L477 379" fill="none" stroke="'+primary+'" stroke-width="14" stroke-linecap="round"/>'+
      '</g>';
  }else if(variant===1){
    shapes='<g filter="url(#shadow)">'+
      '<rect x="360" y="62" width="355" height="670" rx="53" fill="#101d32"/>'+
      '<rect x="382" y="96" width="311" height="594" rx="28" fill="#ffffff"/>'+
      '<rect x="473" y="108" width="134" height="18" rx="9" fill="#152642"/>'+
      '<rect x="420" y="156" width="235" height="162" rx="12" fill="'+soft+'"/>'+
      '<rect x="420" y="349" width="235" height="14" rx="7" fill="'+primary+'" opacity=".68"/>'+
      '<rect x="420" y="383" width="202" height="12" rx="6" fill="'+primary+'" opacity=".22"/>'+
      '<rect x="420" y="411" width="226" height="12" rx="6" fill="'+primary+'" opacity=".22"/>'+
      '<rect x="420" y="439" width="177" height="12" rx="6" fill="'+primary+'" opacity=".22"/>'+
      '<rect x="420" y="500" width="235" height="82" rx="14" fill="'+accent+'"/>'+
      '</g>';
  }else if(variant===2){
    shapes='<g filter="url(#shadow)">'+
      '<rect x="125" y="148" width="830" height="490" rx="37" fill="#1d2d3f"/>'+
      '<rect x="151" y="178" width="776" height="426" rx="13" fill="#fff"/>'+
      '<rect x="170" y="197" width="736" height="390" rx="10" fill="'+soft+'"/>'+
      '<rect x="210" y="228" width="240" height="325" rx="10" fill="#ffffff"/>'+
      '<rect x="478" y="228" width="386" height="143" rx="14" fill="'+primary+'" opacity=".18"/>'+
      '<rect x="478" y="391" width="386" height="162" rx="14" fill="#ffffff"/>'+
      '</g>';
  }else if(variant===3){
    shapes='<g filter="url(#shadow)">';
    for(let j=0;j<4;j++){
      const x=106+j*220,y=154+(j%2)*36;
      shapes+='<g transform="translate('+x+' '+y+') rotate('+(j%2?-6:5)+' 95 195)">'+
        '<rect width="192" height="390" rx="15" fill="#fff"/>'+
        '<rect x="15" y="18" width="162" height="190" rx="10" fill="'+(j%2?accent:soft)+'"/>'+
        '<circle cx="97" cy="104" r="61" fill="'+primary+'" opacity=".23"/>'+
        '<rect x="23" y="232" width="141" height="12" rx="5" fill="'+primary+'" opacity=".72"/>'+
        '<rect x="23" y="261" width="124" height="8" rx="4" fill="'+primary+'" opacity=".26"/>'+
        '<rect x="23" y="286" width="142" height="8" rx="4" fill="'+primary+'" opacity=".26"/>'+
        '<rect x="23" y="311" width="109" height="8" rx="4" fill="'+primary+'" opacity=".26"/>'+
        '</g>';
    }
    shapes+='</g>';
  }else{
    shapes='<g filter="url(#shadow)">'+
      '<rect x="193" y="135" width="340" height="532" rx="13" fill="'+primary+'"/>'+
      '<rect x="215" y="157" width="296" height="487" rx="9" fill="'+soft+'"/>'+
      '<rect x="534" y="189" width="318" height="440" rx="13" fill="#fff" stroke="'+accent+'" stroke-width="11"/>'+
      '<rect x="558" y="214" width="270" height="167" rx="12" fill="'+soft+'"/>'+
      '<rect x="558" y="412" width="260" height="11" rx="6" fill="'+primary+'" opacity=".45"/>'+
      '<rect x="558" y="441" width="220" height="11" rx="6" fill="'+primary+'" opacity=".22"/>'+
      '<rect x="558" y="470" width="240" height="11" rx="6" fill="'+primary+'" opacity=".22"/>'+
      '</g>';
  }
  return start+shapes+
    '<rect x="32" y="30" width="261" height="40" rx="20" fill="'+primary+'"/>'+
    '<text x="51" y="56" fill="#fff" font-family="Arial,sans-serif" font-size="17" font-weight="bold">VISUAL '+String(n+1).padStart(2,'0')+' / DEMONSTRAÇÃO</text>'+
    '<rect x="90" y="684" width="900" height="99" rx="18" fill="'+primary+'"/>'+
    '<text x="124" y="724" fill="#fff" font-size="28" font-family="Arial,sans-serif" font-weight="bold">'+brandLabel+'</text>'+
    '<text x="124" y="755" fill="'+accent+'" font-size="20" font-family="Arial,sans-serif">'+topicLabel+'</text>'+
    '<rect x="825" y="682" width="158" height="30" rx="14" fill="'+accent+'"/>'+
    '<text x="835" y="703" fill="'+ink+'" font-size="12" font-family="Arial,sans-serif">ILUSTRATIVO</text>'+
    '</svg>';
}
export function pageVisualAssets(d:SalesPageDraft,theme:'clinic'|'agenda'):VisualAsset[]{
  return AUTO_VISUAL_LABELS.map((fallback,n)=>{
    const manual=(d.gallery||[])[n];
    const label=(manual?.label||fallback).slice(0,110);
    const manualUrl=safeImageUrl(manual?.url);
    const generated='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
      mockSvg(n,d.brand||'Material digital',label,theme));
    return {label,src:manualUrl||generated,illustrative:!manualUrl};
  });
}
