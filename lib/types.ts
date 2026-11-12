export type Platform = 'meta' | 'tiktok' | 'google' | 'youtube' | 'other';
export type ProductStatus = 'researching' | 'ready' | 'testing' | 'winning' | 'discarded';
export type ProductType = 'digital' | 'physical' | 'saas' | 'service';
export type AdStatus = 'active' | 'inactive' | 'unknown';

export interface Product {
  id: string; user_id: string; name: string; niche: string; product_type: ProductType;
  country: string; language: string; currency: string; sale_price: number | null;
  fulfillment_cost: number | null; extra_cost: number | null;
  landing_url: string; checkout_url: string; landing_copy: string; promise: string;
  target_audience: string; notes: string; status: ProductStatus;
  created_at: string; updated_at: string;
}
export interface Ad {
  id: string; user_id: string; product_id: string; name: string;
  platform: Platform; advertiser: string; ad_url: string;
  creative_path: string | null; creative_type: 'image' | 'video' | null;
  ad_copy: string; hook: string; cta: string; notes: string;
  first_seen_at: string | null; started_at: string | null;
  observed_active: AdStatus; is_favorite: boolean;
  meta_library_id: string | null; link_check_result: 'not_checked'|'verified'|'partial'|'unavailable';
  last_checked_at: string | null; last_check_message: string;
  started_at_source: 'unknown'|'public_page'|'manual';
  status_source: 'unknown'|'public_page'|'manual';
  created_at: string; updated_at: string;
}
export interface Snapshot {
  id: string; user_id: string; ad_id: string; checked_at: string;
  status: AdStatus; estimated_creatives: number | null; notes: string;
  check_method: 'manual'|'link'; check_result: 'manual'|'verified'|'partial'|'unavailable';
}
export interface Breakdown {
  demand: number; offer: number; pain: number; margin: number; execution: number; risk: number;
}
export interface Analysis {
  id: string; user_id: string; product_id: string; ad_id: string | null;
  kind: 'product' | 'ad'; score: number; confidence: 'low'|'medium'|'high';
  summary: string; strengths: string[]; risks: string[]; opportunities: string[];
  breakdown: Breakdown; recommendation: string; model: string;
  created_at: string;
}
export interface TestRun {
  id: string; user_id: string; product_id: string; start_date: string;
  budget: number; spend: number; clicks: number; leads: number; sales: number;
  revenue: number; notes: string; created_at: string;
}
export const statuses: Record<ProductStatus, string> = {
  researching:'Pesquisando', ready:'Pronto para testar', testing:'Em teste',
  winning:'Validado', discarded:'Descartado'
};
export const productTypes: Record<ProductType,string> = {
  digital:'Digital', physical:'Físico', saas:'SaaS', service:'Serviço'
};
export const platforms: Record<Platform,string> = {
  meta:'Meta', tiktok:'TikTok', google:'Google', youtube:'YouTube', other:'Outro'
};
export const adStatuses: Record<AdStatus,string> = {active:'Ativo',inactive:'Inativo',unknown:'Não verificado'};
