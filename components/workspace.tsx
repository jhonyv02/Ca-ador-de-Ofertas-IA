'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase/browser';
import type { Ad, Analysis, Product, Snapshot, TestRun } from '@/lib/types';
type Data = {
  supabase: SupabaseClient; products: Product[]; ads: Ad[]; analyses: Analysis[];
  snapshots: Snapshot[]; testRuns: TestRun[];
  loading:boolean; error:string; refresh:()=>Promise<void>;
  latestAnalysis:(productId:string,adId?:string)=>Analysis|undefined;
};
const Context = createContext<Data|null>(null);
export function WorkspaceProvider({children}:{children:React.ReactNode}) {
  const supabase=useMemo(()=>browserClient(),[]);
  const [products,setProducts]=useState<Product[]>([]);
  const [ads,setAds]=useState<Ad[]>([]);
  const [analyses,setAnalyses]=useState<Analysis[]>([]);
  const [snapshots,setSnapshots]=useState<Snapshot[]>([]);
  const [testRuns,setTestRuns]=useState<TestRun[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    const results=await Promise.all([
      supabase.from('products').select('*').order('created_at',{ascending:false}),
      supabase.from('ads').select('*').order('created_at',{ascending:false}),
      supabase.from('analyses').select('*').order('created_at',{ascending:false}),
      supabase.from('ad_snapshots').select('*').order('checked_at',{ascending:false}),
      supabase.from('test_runs').select('*').order('created_at',{ascending:false})
    ]);
    const bad=results.find(r=>r.error);
    setError(bad?.error?.message||'');
    if(!bad){setProducts((results[0].data||[]) as Product[]);setAds((results[1].data||[]) as Ad[]);
      setAnalyses((results[2].data||[]) as Analysis[]);setSnapshots((results[3].data||[]) as Snapshot[]);
      setTestRuns((results[4].data||[]) as TestRun[]);}
    setLoading(false);
  },[supabase]);
  useEffect(()=>{void refresh();},[refresh]);
  const latestAnalysis=useCallback((productId:string,adId?:string)=>analyses.find(a=>a.product_id===productId&&a.kind===(adId?'ad':'product')&&(adId?a.ad_id===adId:true)),[analyses]);
  return <Context.Provider value={{supabase,products,ads,analyses,snapshots,testRuns,loading,error,refresh,latestAnalysis}}>{children}</Context.Provider>;
}
export function useWorkspace(){const x=useContext(Context);if(!x)throw new Error('Workspace ausente');return x;}
