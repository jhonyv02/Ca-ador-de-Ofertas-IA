'use client';
import { useEffect, useState } from 'react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { ImageIcon } from 'lucide-react';
export function Creative({ad}:{ad:Ad}) {
  const {supabase}=useWorkspace(); const [url,setUrl]=useState('');
  useEffect(()=>{let mounted=true;
    if(!ad.creative_path)return;
    void supabase.storage.from('creatives').createSignedUrl(ad.creative_path,3600).then(({data})=>{if(mounted)setUrl(data?.signedUrl||'');});
    return()=>{mounted=false};
  },[ad.creative_path,supabase]);
  return <div className="ad-cover">{url?(ad.creative_type==='video'?<video src={url} controls preload="metadata"/>:<img src={url} alt={`Criativo do anúncio ${ad.name}`}/>):<ImageIcon size={32}/>}</div>;
}
