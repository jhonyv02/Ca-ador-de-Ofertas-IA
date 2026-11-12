import type { Ad, Product, Analysis } from '@/lib/types';
export function brl(n: number | null | undefined, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(n || 0));
}
export function shortDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.valueOf()) ? '—' : d.toLocaleDateString('pt-BR');
}
export function adDays(ad: Ad) {
  if (!ad.started_at) return null;
  const days = Math.floor((Date.now() - new Date(`${ad.started_at}T12:00:00Z`).getTime()) / 86400000);
  return Math.max(0, days);
}
export type Score = { score: number; confidence: string; parts: { label: string; points: number; max: number }[] };
export function opportunityScore(product: Product, ads: Ad[], last?: Analysis): Score {
  if (last) return {score:last.score,confidence:`IA: ${last.confidence}`,parts:[]};
  const price = Number(product.sale_price||0);
  const cost = Number(product.fulfillment_cost||0) + Number(product.extra_cost||0);
  const margin = price > 0 ? (price-cost)/price : 0;
  const days = Math.max(0,...ads.filter(a=>a.observed_active==='active').map(a => adDays(a)||0));
  const parts = [
    {label:'Anúncios documentados',points:Math.min(20,ads.length*4),max:20},
    {label:'Tempo observado',points:Math.min(20,Math.floor(days/3)),max:20},
    {label:'Oferta descrita',points:[product.promise,product.target_audience,product.landing_url].filter(Boolean).length*6 + (price>0?2:0),max:20},
    {label:'Margem estimada',points: price>0 ? Math.max(0,Math.min(20,Math.round(margin*25))) : 0,max:20},
    {label:'Dados coletados',points:Math.min(20,[product.niche,product.notes,product.checkout_url, ...ads.slice(0,3).map(a=>a.hook||a.ad_copy)].filter(Boolean).length*4),max:20},
  ];
  const filled = [price>0,!!product.promise,!!product.target_audience,ads.length>0,!!product.landing_url,ads.some(a=>!!a.ad_copy)].filter(Boolean).length;
  return {score:parts.reduce((a,b)=>a+b.points,0),confidence:`Heurística: ${filled>=5?'média':filled>=3?'baixa':'muito baixa'}`,parts};
}
export function csvEscape(v: unknown) {
  const s = String(v ?? ''); return `"${s.replaceAll('"','""')}"`;
}
export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const csv = '\ufeff'+[header,...rows].map(row=>row.map(csvEscape).join(';')).join('\r\n');
  const a = document.createElement('a'); const u = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(u);
}
export function safeHttpUrl(value: string): string {
  const s=value.trim(); if (!s) return '';
  try {const u = new URL(s); return (u.protocol==='https:'||u.protocol==='http:')?u.toString():'';} catch{return '';}
}
