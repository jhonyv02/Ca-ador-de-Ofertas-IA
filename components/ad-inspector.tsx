'use client';
import { useState } from 'react';
import { ExternalLink, Trash2, Bookmark, CalendarCheck2, Edit2, BrainCircuit, Plus, ScanSearch } from 'lucide-react';
import type { Ad, AdStatus } from '@/lib/types';
import { useWorkspace } from '@/components/workspace';
import { AdForm } from '@/components/forms';
import { AnalyzeButton, AnalysisReport } from '@/components/analyze';
import { Modal, Field, Feedback, StatusPill } from '@/components/ui';
import { Creative } from '@/components/creative';
import { shortDate, adDays } from '@/lib/utils';
import type { MetaInspection } from '@/lib/meta-library';
export function AdInspector({ad,onClose}:{ad:Ad;onClose:()=>void}){
  const {supabase,refresh,snapshots,latestAnalysis,products}=useWorkspace();const [editing,setEditing]=useState(false);const [logging,setLogging]=useState(false);const [status,setStatus]=useState<AdStatus>('active');const [count,setCount]=useState('');const [notes,setNotes]=useState('');const [error,setError]=useState('');const [rechecking,setRechecking]=useState(false);const [lastCheck,setLastCheck]=useState<MetaInspection|null>(null);
  const history=snapshots.filter(s=>s.ad_id===ad.id);const latest=latestAnalysis(ad.product_id,ad.id);const product=products.find(p=>p.id===ad.product_id);
  async function remove(){if(!confirm('Apagar este anúncio, os registros de acompanhamento e suas análises?'))return;const {error}=await supabase.from('ads').delete().eq('id',ad.id);if(error){setError(error.message);return;}if(ad.creative_path)await supabase.storage.from('creatives').remove([ad.creative_path]);await refresh();onClose();}
  async function toggleFav(){const {error}=await supabase.from('ads').update({is_favorite:!ad.is_favorite}).eq('id',ad.id);if(error){setError(error.message);return;}await refresh();onClose();}
  async function recheckLink(){
    setError('');setLastCheck(null);setRechecking(true);
    try{
      const res=await fetch('/api/meta/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:ad.ad_url})});
      const json=await res.json();if(!res.ok)throw new Error(json.error||'Falha ao verificar anúncio.');
      const found=json as MetaInspection;
      const updates:Record<string,unknown>={meta_library_id:found.adId,link_check_result:found.result,last_checked_at:found.checkedAt,last_check_message:found.message};
      if(found.startedAt){updates.started_at=found.startedAt;updates.started_at_source='public_page';}
      if(found.status!=='unknown'){updates.observed_active=found.status;updates.status_source='public_page';}
      const {error:saveError}=await supabase.from('ads').update(updates).eq('id',ad.id);if(saveError)throw saveError;
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sessão expirada.');
      const {error:historyError}=await supabase.from('ad_snapshots').insert({user_id:user.id,ad_id:ad.id,status:found.status,check_method:'link',check_result:found.result,notes:found.message});
      if(historyError)throw historyError;
      setLastCheck(found);await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Falha ao consultar a Meta.');}
    finally{setRechecking(false);}
  }
  async function log(e:React.FormEvent){e.preventDefault();setError('');const {data:{user}}=await supabase.auth.getUser();if(!user)return setError('Sessão expirada');const {error}=await supabase.from('ad_snapshots').insert({user_id:user.id,ad_id:ad.id,status,check_method:'manual',check_result:'manual',estimated_creatives:count===''?null:Number(count),notes});if(error)return setError(error.message);await supabase.from('ads').update({observed_active:status,status_source:status==='unknown'?'unknown':'manual'}).eq('id',ad.id);await refresh();setLogging(false);onClose();}
  return <Modal title={editing?'Editar anúncio':ad.name} subtitle={product?.name||'Anúncio salvo'} onClose={onClose}>
    {editing?<AdForm ad={ad} onCancel={()=>setEditing(false)} onComplete={onClose}/>:<div style={{display:'grid',gap:18}}>
      <Creative ad={ad}/>
      <div className="flex wrap gap-2 center"><StatusPill value={ad.observed_active}/><span className="card-tag">{ad.platform.toUpperCase()}</span><span className="card-tag">{ad.advertiser||'Anunciante não informado'}</span>{ad.started_at&&<span className="card-tag">Início: {shortDate(ad.started_at)} · há {adDays(ad)} dias desde essa data ({ad.started_at_source==='public_page'?'informada pela página':ad.started_at_source==='manual'?'registro manual':'origem não identificada'})</span>}</div>
      {ad.hook&&<div><div className="micro">GANCHO</div><p className="mt-2">{ad.hook}</p></div>}
      {ad.ad_copy&&<div><div className="micro">TEXTO DO ANÚNCIO</div><p className="mt-2" style={{whiteSpace:'pre-wrap'}}>{ad.ad_copy}</p></div>}
      {ad.notes&&<div><div className="micro">OBSERVAÇÕES</div><p className="mt-2" style={{whiteSpace:'pre-wrap'}}>{ad.notes}</p></div>}
      {ad.meta_library_id&&<p className="muted" style={{fontSize:12}}>ID da Biblioteca Meta: {ad.meta_library_id}</p>}
      {ad.link_check_result!=='not_checked'&&<Feedback type={ad.link_check_result==='verified'?'success':'info'}>
        <span><b>Última consulta:</b> {ad.last_check_message} {ad.last_checked_at&&<small> ({new Date(ad.last_checked_at).toLocaleString('pt-BR')})</small>}</span>
      </Feedback>}
      {lastCheck&&<Feedback type={lastCheck.result==='verified'?'success':'info'}><span>{lastCheck.message} {lastCheck.result!=='verified'&&'Você pode clicar em Editar para preencher os campos manualmente.'}</span></Feedback>}
      <div className="flex wrap gap-2"><button className="btn" onClick={()=>setEditing(true)}><Edit2 size={15}/> Editar</button><button className="btn" onClick={toggleFav}><Bookmark size={15}/>{ad.is_favorite?'Desfavoritar':'Favoritar'}</button>{ad.platform==='meta'&&ad.ad_url&&<button className="btn btn-primary" type="button" disabled={rechecking} onClick={recheckLink}><ScanSearch size={15}/>{rechecking?'Consultando...':'Verificar link agora'}</button>}{ad.ad_url&&<a className="btn" href={ad.ad_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Ver original</a>}<button className="btn btn-danger" onClick={remove}><Trash2 size={15}/> Excluir</button></div>
      <hr className="hr"/>
      <div className="flex between center"><h3>Histórico de verificação</h3><button className="btn" onClick={()=>setLogging(!logging)}><Plus size={15}/> Registrar verificação</button></div>
      {logging&&<form onSubmit={log} className="form-grid"><Field label="Status no momento"><select className="input" value={status} onChange={e=>setStatus(e.target.value as AdStatus)}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="unknown">Não verificado</option></select></Field><Field label="Qtd. de criativos observados (opcional)"><input type="number" min="0" className="input" value={count} onChange={e=>setCount(e.target.value)}/></Field><div className="full"><Field label="Notas"><input className="input" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Como está o anúncio hoje?"/></Field></div><div className="full"><button type="submit" className="btn btn-primary">Salvar verificação</button></div></form>}
      {history.length===0?<p className="muted" style={{fontSize:12}}>Nenhuma verificação registrada. Você pode consultar pelo link ou registrar uma observação manual.</p>:history.map(h=><div className="watchlist-row" key={h.id}><div><span>{new Date(h.checked_at).toLocaleString('pt-BR')} · {h.check_method==='link'?'Consulta por link':'Registro manual'}</span><div className="micro">{h.notes||`${h.estimated_creatives??'—'} criativos observados`}</div></div><StatusPill value={h.status}/></div>)}
      <hr className="hr"/><h3>Análise do anúncio</h3><AnalyzeButton productId={ad.product_id} adId={ad.id}/>{latest?<AnalysisReport analysis={latest}/>:<p className="muted" style={{fontSize:12}}>Use a IA para avaliar gancho, copy, promessa e risco deste anúncio.</p>}
      {error&&<Feedback type="error">{error}</Feedback>}
    </div>}
  </Modal>;
}
