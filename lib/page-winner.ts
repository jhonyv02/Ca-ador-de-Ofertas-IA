import type {Product,TestRun} from './types';

export type WinnerCandidate={
  productId:string;name:string;clicks:number;sales:number;spend:number;revenue:number;
  conversionRate:number|null;cpa:number|null;roas:number|null;
  reliable:boolean;hasSavedPage:boolean;
};
/**
 * Os dados são por produto/teste, NÃO por versão de landing page.
 * Uma página vencedora só é sugerida se tiver rascunho próprio + amostra mínima.
 */
export function pageWinnerCandidates(products:Product[],runs:TestRun[]):WinnerCandidate[]{
  return products.map(p=>{
    const own=runs.filter(r=>r.product_id===p.id);
    const clicks=own.reduce((n,r)=>n+Math.max(0,r.clicks||0),0);
    const sales=own.reduce((n,r)=>n+Math.max(0,r.sales||0),0);
    const spend=own.reduce((n,r)=>n+Math.max(0,r.spend||0),0);
    const revenue=own.reduce((n,r)=>n+Math.max(0,r.revenue||0),0);
    const hasSavedPage=p.landing_copy?.startsWith('CACADOR_ORIGINAL_PAGE_V1:')||false;
    return {productId:p.id,name:p.name,clicks,sales,spend,revenue,
      conversionRate:clicks>0&&sales<=clicks?sales/clicks:null,
      cpa:spend>0&&sales>0?spend/sales:null,
      roas:spend>0?revenue/spend:null,
      reliable:hasSavedPage&&clicks>=40&&sales>=2&&sales<=clicks,
      hasSavedPage};
  }).filter(x=>x.hasSavedPage)
    .sort((a,b)=>Number(b.reliable)-Number(a.reliable)||
      (b.conversionRate??-1)-(a.conversionRate??-1)||
      b.sales-a.sales||
      (a.cpa??Infinity)-(b.cpa??Infinity));
}
export function suggestedWinner(products:Product[],runs:TestRun[]):WinnerCandidate|null{
  return pageWinnerCandidates(products,runs).find(x=>x.reliable)||null;
}
