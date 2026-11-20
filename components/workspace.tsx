'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase/browser';
import type { Ad, Analysis, Product, Snapshot, TestRun } from '@/lib/types';
import {dbErrorMessage} from '@/lib/db-error';
type Data = {
  supabase: SupabaseClient; products: Product[]; ads: Ad[]; analyses: Analysis[];
  snapshots: Snapshot[]; testRuns: TestRun[];
  loading:boolean; error:string; adsLoading:boolean; adsError:string; refresh:()=>Promise<void>;
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
  const [adsLoading,setAdsLoading]=useState(true);
  const [adsError,setAdsError]=useState('');
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    // Cada seção tem carga independente: erro em anúncios/análises não pode
    // esconder produtos válidos nem travar o radar de ofertas.
    const loadAds=async()=>{
      try {
        const result=await supabase.from('ads').select('*').order('created_at',{ascending:false});
        if(!result.error) setAds((result.data||[]) as Ad[]);
        setAdsError(result.error?dbErrorMessage(result.error,'Erro no banco'):'');
        return result;
      } catch(err) {
        setAdsError(dbErrorMessage(err,'Falha de conexão'));
        throw err;
      } finally {
        setAdsLoading(false);
      }
    };
    const jobs=[
      supabase.from('products').select('*').order('created_at',{ascending:false}),
      loadAds(),
      supabase.from('analyses').select('*').order('created_at',{ascending:false}),
      supabase.from('ad_snapshots').select('*').order('checked_at',{ascending:false}),
      supabase.from('test_runs').select('*').order('created_at',{ascending:false})
    ];
    const names=['ofertas','anúncios','análises','histórico','testes'];
    try {
      const results=await Promise.allSettled(jobs);
      const failures:string[]=[];
      for(let i=0;i<results.length;i++){
        const item=results[i];
        if(item.status==='rejected'){
          failures.push(names[i]+': '+dbErrorMessage(item.reason,'Falha de conexão'));
          continue;
        }
        const {data,error}=item.value;
        if(error){
          failures.push(names[i]+': '+dbErrorMessage(error,'Erro no banco'));
          continue;
        }
        switch(i){
          case 0:setProducts((data||[]) as Product[]);break;
          case 2:setAnalyses((data||[]) as Analysis[]);break;
          case 3:setSnapshots((data||[]) as Snapshot[]);break;
          case 4:setTestRuns((data||[]) as TestRun[]);break;
        }
      }
      setError(failures.length?
        'Algumas seções não carregaram. As seções disponíveis continuam acessíveis. '+failures.join(' | '):
        '');
    } catch(err) {
      setError(dbErrorMessage(err,'Falha de conexão com o Supabase'));
    } finally {
      setLoading(false);
    }
  },[supabase]);
  useEffect(()=>{void refresh();},[refresh]);
  const latestAnalysis=useCallback((productId:string,adId?:string)=>{
    if(adId)return analyses.find(a=>a.product_id===productId&&a.kind==='ad'&&a.ad_id===adId);
    return analyses.find(a=>a.product_id===productId&&a.kind==='openai_audit')
      ?? analyses.find(a=>a.product_id===productId&&a.kind==='product');
  },[analyses]);
  return <Context.Provider value={{supabase,products,ads,analyses,snapshots,testRuns,loading,error,adsLoading,adsError,refresh,latestAnalysis}}>{children}</Context.Provider>;
}
export function useWorkspace(){const x=useContext(Context);if(!x)throw new Error('Workspace ausente');return x;}
