/**
 * Filtro conservador da operação Mundo Imprimível.
 * Score alto NÃO transforma um curso, aplicativo ou ebook comum em imprimível.
 * Produtos antigos permanecem no banco; só saem da seleção principal.
 */
export type PrintableInput={
  product_type?:string|null;
  format?:string|null;
  name?:string|null;
  niche?:string|null;
  promise?:string|null;
  notes?:string|null;
};

function normalize(value:unknown){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

export function printableEligibility(product:PrintableInput):{eligible:boolean;reason:string}{
  if(product.product_type!=='digital'){
    return {eligible:false,reason:'A operação aceita apenas produtos digitais.'};
  }
  const notes=normalize(product.notes);
  const explicitFormat=normalize(product.format).trim()||
    (notes.match(/(?:^|\n)#formato-digital:([a-z]+)/)?.[1]||'');
  if(['app','curso','audio','planilha'].includes(explicitFormat)){
    return {eligible:false,reason:'Formato fora da operação de imprimíveis.'};
  }
  if(explicitFormat==='printable'){
    return {eligible:true,reason:'Classificado explicitamente como imprimível.'};
  }
  const descriptive=normalize([product.name,product.niche,product.promise,product.notes].join(' '));
  const printableSignal=/(?:para imprimir|pront[oa]s? para impressao|imprimiveis?|printables?|fichas? (?:a4|imprimiveis?|para imprimir)|cartoes? para imprimir|moldes? para imprimir|atividades? (?:em )?a4|folhas? a4|pdf para impressao|printable worksheets)/.test(descriptive);
  if(['templates','biblioteca','ebook',''].includes(explicitFormat)&&printableSignal){
    return {eligible:true,reason:'Descrição contém indicação explícita de uso impresso.'};
  }
  return {eligible:false,reason:'Faltam evidências explícitas de que o material seja imprimível.'};
}
export function isPrintableOffer(product:PrintableInput){return printableEligibility(product).eligible;}
