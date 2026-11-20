import type {Ad, Product} from './types';

export const digitalFormats=[
  {id:'printable',label:'Atividades para imprimir',ease:20},
  {id:'templates',label:'Modelos / templates',ease:20},
  {id:'planilha',label:'Planilhas / calculadoras',ease:18},
  {id:'ebook',label:'E-book / guia',ease:16},
  {id:'biblioteca',label:'Biblioteca de materiais',ease:14},
  {id:'audio',label:'Áudios / meditações',ease:10},
  {id:'curso',label:'Curso em vídeo',ease:8},
  {id:'app',label:'Aplicativo / plataforma',ease:4},
] as const;

export const digitalNiches=[
  {name:'Educação infantil',terms:{pt:'atividades educativas para imprimir',es:'actividades educativas imprimibles',en:'printable learning activities'}},
  {name:'Terapias e psicologia',terms:{pt:'materiais terapêuticos para profissionais',es:'recursos terapeuticos para psicologos',en:'therapy worksheets bundle'}},
  {name:'Exercícios e terceira idade',terms:{pt:'atividades para idosos',es:'actividades adultos mayores',en:'senior activity printables'}},
  {name:'Organização e produtividade',terms:{pt:'planner digital',es:'agenda digital plantilla',en:'digital planner templates'}},
  {name:'Artesanato e moldes',terms:{pt:'moldes artesanato pdf',es:'patrones para imprimir',en:'craft sewing patterns PDF'}},
  {name:'Educação e concursos',terms:{pt:'apostilas mapas mentais',es:'material didactico descargable',en:'study guides printable'}},
  {name:'Finanças e planilhas',terms:{pt:'planilha financeira',es:'plantilla excel finanzas',en:'budget spreadsheet templates'}},
  {name:'Receitas e alimentação',terms:{pt:'ebook receitas',es:'recetario digital',en:'recipe ebook bundle'}},
] as const;

export const markets=[
  {code:'US',country:'Estados Unidos',language:'en',currency:'USD',label:'Estados Unidos · inglês'},
  {code:'ES',country:'Espanha',language:'es',currency:'EUR',label:'Espanha · espanhol'},
  {code:'MX',country:'México',language:'es',currency:'MXN',label:'México · espanhol'},
  {code:'AR',country:'Argentina',language:'es',currency:'ARS',label:'Argentina · espanhol'},
  {code:'PT',country:'Portugal',language:'pt-PT',currency:'EUR',label:'Portugal · português'},
  {code:'BR',country:'Brasil',language:'pt-BR',currency:'BRL',label:'Brasil · português'},
] as const;

export const difficultyValues=['facil','moderada','dificil'] as const;
export type Difficulty=(typeof difficultyValues)[number];
export type EasePoints={points:number;max:number};
export type OfferFacts={
  formatId:string;formatLabel:string;difficulty:Difficulty|'';effort:string;
};

const effortNames:Record<Difficulty,string>={
  facil:'Menor esforço estimado',
  moderada:'Esforço moderado',
  dificil:'Maior esforço estimado',
};

function finiteInRange(value:unknown,min:number,max:number):number|null {
  const numeric=typeof value==='string'&&value.trim()!==''?Number(value):value;
  if(typeof numeric!=='number'||!Number.isFinite(numeric))return null;
  if(numeric<min||numeric>max)return null;
  return numeric;
}
export function normalizeDifficulty(value:unknown):Difficulty|'' {
  if(typeof value!=='string')return '';
  const normalized=value.trim().toLowerCase();
  return (difficultyValues as readonly string[]).includes(normalized)?normalized as Difficulty:'';
}
export function resolveFormatId(product:{format?:string|null;notes?:string|null}):string {
  const column=(product.format||'').trim().toLowerCase();
  if(digitalFormats.some(f=>f.id===column))return column;
  return getDigitalFormat(product.notes||'');
}
export function getDigitalFormat(notes:string):string {
  const found=notes.match(/(?:^|\n)#formato-digital:([a-z]+)/i)?.[1]?.toLowerCase()||'';
  return digitalFormats.find(f=>f.id===found)?.id||'';
}
export function formatName(notes:string){
  const format=getDigitalFormat(notes);
  return digitalFormats.find(f=>f.id===format)?.label||'Formato não informado';
}
export function formatLabel(product:{format?:string|null;notes?:string|null}){
  const format=resolveFormatId(product);
  return digitalFormats.find(f=>f.id===format)?.label||'Formato não informado';
}
/** Pontos de facilidade gravados pelo assistente ou pela análise IA.
 *  `ease` / `facilidade` usam a escala 0–30. `execution` acima de 15 também
 *  entra nessa escala; até 15 segue o critério oficial da análise (0–15). */
export function easeFromBreakdown(breakdown:unknown):EasePoints|null {
  if(!breakdown||typeof breakdown!=='object')return null;
  const record=breakdown as Record<string,unknown>;
  for(const key of ['ease','facilidade','ease_score']){
    const points=finiteInRange(record[key],0,30);
    if(points!==null)return {points,max:30};
  }
  const execution=finiteInRange(record.execution,0,30);
  if(execution===null)return null;
  if(execution>15)return {points:execution,max:30};
  return {points:execution,max:15};
}
export function levelFromPoints(points:number,max:number):Difficulty {
  const ratio=max>0?points/max:0;
  if(ratio>=2/3)return 'facil';
  if(ratio>=0.4)return 'moderada';
  return 'dificil';
}
export function effortLabel(level:Difficulty|'',points?:EasePoints|null,showPoints=false){
  if(!level)return 'Não avaliado';
  const name=effortNames[level];
  if(showPoints&&points)return name+' · '+points.points+'/'+points.max;
  return name;
}
export function offerFacts(
  product:{format?:string|null;notes?:string|null;difficulty?:string|null},
  analysis?:{breakdown?:unknown}|null,
):OfferFacts {
  const formatId=resolveFormatId(product);
  const formatLabelText=digitalFormats.find(f=>f.id===formatId)?.label||'Formato não informado';
  const column=normalizeDifficulty(product.difficulty);
  const points=easeFromBreakdown(analysis?.breakdown);
  if(column){
    return {formatId,formatLabel:formatLabelText,difficulty:column,effort:effortLabel(column,points,!!points)};
  }
  if(points){
    const level=levelFromPoints(points.points,points.max);
    return {formatId,formatLabel:formatLabelText,difficulty:level,effort:effortLabel(level,points,true)};
  }
  const preset=digitalFormats.find(f=>f.id===formatId);
  if(!preset)return {formatId,formatLabel:formatLabelText,difficulty:'',effort:'Não avaliado'};
  const level:Difficulty=preset.ease>=18?'facil':preset.ease>=14?'moderada':'dificil';
  return {formatId,formatLabel:formatLabelText,difficulty:level,effort:effortLabel(level)};
}
export function formatTag(format:string){
  return digitalFormats.some(f=>f.id===format)?'#formato-digital:'+format:'';
}
export function metaDiscoveryUrl(niche:string,marketCode:string){
  const n=digitalNiches.find(item=>item.name===niche)||digitalNiches[0];
  const m=markets.find(item=>item.code===marketCode)||markets[0];
  const lang=m.language==='es'?'es':m.language==='en'?'en':'pt';
  const params=new URLSearchParams({
    active_status:'active',ad_type:'all',country:m.code,q:n.terms[lang],
    search_type:'keyword_unordered'
  });
  return 'https://www.facebook.com/ads/library/?'+params.toString();
}
export function comparableUrl(value:string){
  try{
    const url=new URL(value.trim());
    if(url.protocol!=='https:'&&url.protocol!=='http:')return '';
    return url.hostname.replace(/^www\./,'').toLowerCase()+url.pathname.replace(/\/+$/,'').toLowerCase();
  }catch{return '';}
}

export type DigitalRadar={score:number;label:string;next:string;confidence:string;activeVerified:number;
  clues:string[];hasEvidence:boolean;effort:string};
export function digitalRadar(product:Product,ads:Ad[],analysis?:{breakdown?:unknown}|null):DigitalRadar {
  const facts=offerFacts(product,analysis);
  const f=digitalFormats.find(x=>x.id===facts.formatId);
  const withMetaId=ads.filter(a=>!!a.meta_library_id);
  const verified=ads.filter(a=>a.observed_active==='active'&&
    a.status_source==='public_page'&&a.link_check_result==='verified');
  const dated=verified.some(a=>a.started_at_source==='public_page'&&!!a.started_at&&
    (Date.now()-new Date(a.started_at+'T12:00:00Z').getTime())>=14*86400000);
  const clues:string[]=[];
  if(product.landing_url)clues.push('Página de referência salva');
  if(product.sale_price!==null)clues.push('Preço informado');
  if(withMetaId.length)clues.push(withMetaId.length+' anúncio(s) identificado(s)');
  if(verified.length)clues.push(verified.length+' anúncio(s) com status verificado');
  const score=
    (product.landing_url?18:0)+(product.sale_price!==null?10:0)+(product.niche?10:0)+
    (product.promise?8:0)+(product.target_audience?6:0)+(ads.length?6:0)+
    (withMetaId.length?12:0)+(verified.length?12:0)+(dated?0:0)+
    (f?.ease||0);
  // Potencial de execução é uma aproximação pelo formato, não valida propriedade,
  // existência do entregável, desempenho financeiro ou autorização de uso.
  const effort=facts.effort;
  const next=!product.landing_url?'Adicionar a página concorrente':
    !f?'Informar o formato do material':
    !product.niche?'Escolher o nicho':
    product.sale_price===null?'Conferir o preço do concorrente':
    !withMetaId.length?'Pesquisar anúncios individuais na Meta':
    !verified.length?'Confirmar atividade dos anúncios':
    !product.promise?'Registrar a promessa e o público':
    'Analisar riscos e planejar versão original';
  return {
    score:Math.min(100,score),
    label:score>=63?'Investigar primeiro':score>=34?'Em avaliação':'Precisa de dados',
    next,
    confidence:verified.length?'Com anúncios verificados':'Sem comprovação de vendas',
    activeVerified:verified.length,
    hasEvidence:!!withMetaId.length,
    effort,
    clues
  };
}
