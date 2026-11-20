'use client';
import { useEffect, useState } from 'react';
import type { Ad } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { safeHttpUrl } from '@/lib/utils';
import { ImageIcon, Play } from 'lucide-react';

export function Creative({ad}:{ad:Ad}) {
  const {supabase}=useWorkspace();
  const [url,setUrl]=useState('');
  const path=ad.creative_path||ad.creative_thumb_path||'';
  const usingThumb=!ad.creative_path&&!!ad.creative_thumb_path;
  const videoFile=!!ad.creative_path&&ad.creative_type==='video';
  useEffect(()=>{let mounted=true;
    if(!path){setUrl('');return;}
    void supabase.storage.from('creatives').createSignedUrl(path,3600).then(({data})=>{if(mounted)setUrl(data?.signedUrl||'');});
    return()=>{mounted=false};
  },[path,supabase]);
  if(!path){
    if(ad.creative_type==='video'){
      const href=safeHttpUrl(ad.ad_url||'');
      const label=<span className="creative-video-fallback"><Play size={18}/>Vídeo — assistir na Biblioteca</span>;
      return href
        ? <a className="ad-cover" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
        : <div className="ad-cover">{label}</div>;
    }
    return <div className="ad-cover"><ImageIcon size={32}/></div>;
  }
  return <div className="ad-cover">{url?(videoFile?<video src={url} controls preload="metadata"/>:<><img src={url} alt={`Criativo do anúncio ${ad.name}`}/>{usingThumb&&<span className="creative-play" aria-hidden="true"><Play size={16} fill="currentColor"/></span>}</>):<ImageIcon size={32}/>}</div>;
}
