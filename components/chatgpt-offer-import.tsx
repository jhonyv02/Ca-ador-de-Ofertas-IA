'use client';
import {useEffect, useRef, useState} from 'react';
import {BookOpenCheck, CloudDownload, LoaderCircle, RefreshCcw} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {chatOffers, metaSearchLinks, type ChatOffer} from '@/lib/chatgpt-offers';
import {Feedback} from '@/components/ui';
import type {Product} from '@/lib/types';
import {dbErrorMessage} from '@/lib/db-error';

const keyMarker=(key:string)=>'#chatgpt:'+key;
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const urlKey=(s:string)=>{try{const u=new URL(s);return (u.hostname.replace(/^www\./,'')+u.pathname.replace(/\/$/,'')).toLowerCase();}catch{return '';}};
function isPresent(offer:ChatOffer, items:Pick<Product,'name'|'notes'|'landing_url'>[]) {
  const marker=keyMarker(offer.key);
  return items.some(p=>p.notes?.includes(marker)||norm(p.name)===norm(offer.name)||
    (!!offer.url&&!!p.landing_url&&urlKey(offer.url)===urlKey(p.landing_url)));
}
function money(o:ChatOffer) {
  if(o.price===null)return 'Preço a verificar';
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:o.currency}).format(o.price);
}
export function ChatgptOfferImport(){
  const {supabase,products,loading,refresh}=useWorkspace();
  const started=useRef(false);
  const busy=useRef(false);
  const [syncing,setSyncing]=useState(false);
  const [message,setMessage]=useState('');
  const [failure,setFailure]=useState('');
  const [expanded,setExpanded]=useState(false);
  const pending=chatOffers.filter(o=>!isPresent(o,products));

  // Pesquisas salvas em notas; elas não são anúncios individuais comprovados.
  function researchBlock(offer:ChatOffer){
    const lines=[
      '#pesquisa-meta-v2:'+offer.key,
      'Fonte: curadoria de ofertas pesquisadas no ChatGPT (15/11/2026).',
      keyMarker(offer.key),
      'Triagem de tráfego direto: '+(offer.priority==='A'?'investigar primeiro':offer.priority==='B'?'segunda prioridade':'não priorizar ainda')+'.',
      'Vendedor/marca de referência: '+(offer.advertiser||'não identificado')+'.',
      'Página independente: '+(offer.url||'não localizada')+'.',
      'Oferta/marketplace: '+(offer.marketplace||'não localizado')+'.',
      'Checkout direto: '+(offer.checkout||'não identificado')+'.',
      'Status de anúncios Meta: NÃO VERIFICADO. Links abaixo são BUSCAS, não anúncios.',
      ...metaSearchLinks(offer).map((m,i)=>(i+1)+'. Pesquisa Meta ('+m.label+'): '+m.url),
      'Promessa: '+offer.promise,
      'Risco principal: '+(offer.risk||'verificar entrega e rentabilidade'),
      'Observações: '+offer.notes,
      'Teste de 7 dias: D1 validar produto/links/mercado; D2 checar criativos Meta reais e amostras; D3-4 testar criativo/página com orçamento controlado; D5-6 ajustar ou testar variante; D7 analisar CPC, CPA, compras, reembolsos e margem.'
    ];
    return lines.join('\n');
  }

  async function synchronize(silent=false){
    if(busy.current)return;
    busy.current=true;setSyncing(true);setFailure('');if(!silent)setMessage('');
    let created=0,updated=0;
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user)throw new Error('Entre novamente para sincronizar as ofertas.');
      const {data:rows,error:listError}=await supabase.from('products')
        .select('id,name,notes,landing_url,checkout_url').eq('user_id',user.id);
      if(listError)throw listError;
      type Existing=Pick<Product,'id'|'name'|'notes'|'landing_url'|'checkout_url'>;
      const current=(rows||[]) as Existing[];
      for(const offer of chatOffers){
        const marker=keyMarker(offer.key);
        const existing=current.find(p=>p.notes?.includes(marker)||norm(p.name)===norm(offer.name)||
          (!!offer.url&&!!p.landing_url&&urlKey(offer.url)===urlKey(p.landing_url)));
        const block=researchBlock(offer);
        if(existing){
          const patch:Record<string,string>={};
          // Preenche lacunas; nunca substitui links que o usuário já editou.
          if(!existing.landing_url&&offer.url)patch.landing_url=offer.url;
          if(!existing.checkout_url&&offer.checkout)patch.checkout_url=offer.checkout;
          if(!existing.notes?.includes('#pesquisa-meta-v2:'+offer.key)){
            const combined=[existing.notes,block].filter(Boolean).join('\n\n');
            if(combined.length<=5000)patch.notes=combined;
          }
          if(Object.keys(patch).length){
            const {error}=await supabase.from('products').update(patch).eq('id',existing.id).eq('user_id',user.id);
            if(error)throw new Error('Erro ao completar '+offer.name+': '+error.message);
            Object.assign(existing,patch);updated++;
          }
          continue;
        }
        const row={
          user_id:user.id,name:offer.name,niche:offer.niche,product_type:'digital',
          country:offer.country,language:offer.language,currency:offer.currency,
          sale_price:offer.price,fulfillment_cost:null,extra_cost:null,
          landing_url:offer.url,checkout_url:offer.checkout,landing_copy:'',
          promise:offer.promise,target_audience:offer.audience,
          notes:block.slice(0,5000),status:'researching'
        };
        const {data:added,error}=await supabase.from('products').insert(row).select('id').single();
        if(error)throw new Error('Erro ao importar '+offer.name+': '+error.message);
        current.push({id:added.id,name:offer.name,notes:row.notes,landing_url:offer.url,checkout_url:offer.checkout});
        created++;
      }
      if(created||updated)await refresh();
      setMessage(created||updated?
        created+' nova(s) oferta(s) e '+updated+' cadastro(s) complementado(s), sem duplicar. Meta: buscas pendentes de confirmação.':
        'Catálogo sincronizado: todas as ofertas já estavam cadastradas e atualizadas.');
    }catch(e){
      if(created||updated)await refresh();
      setFailure(dbErrorMessage(e,'Falha ao sincronizar ofertas')+
        (created||updated?' ('+created+' criada(s), '+updated+' atualizada(s) antes da falha; execute novamente.)':''));
    }finally{busy.current=false;setSyncing(false);}
  }

  // O usuário autorizou importar as ofertas encontradas. Em cada visita só
  // acrescenta as ofertas ainda ausentes; nunca altera dados já editados.
  useEffect(()=>{
    if(!loading&&!started.current){started.current=true;void synchronize(true);}
    // Execução intencional apenas quando a consulta inicial do Workspace termina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loading]);

  return <section className="panel" style={{padding:20,marginBottom:22}}>
    <div className="flex between center wrap gap-2">
      <div>
        <div className="micro">RADAR · OFERTAS ENCONTRADAS NO CHATGPT</div>
        <h2 style={{fontSize:19,margin:'7px 0 4px'}}>Central de oportunidades para a semana de teste</h2>
        <p className="muted" style={{fontSize:13,maxWidth:700}}>
          {chatOffers.length} ofertas recuperadas · {chatOffers.filter(o=>o.priority==='A').length} para investigar primeiro.
          Sincronização segura: completa links vazios, preserva suas edições e nunca inventa anúncios. As pesquisas Meta são atalhos.
        </p>
      </div>
      <button className="btn btn-primary" onClick={()=>void synchronize()} disabled={syncing||loading}>
        {syncing?<LoaderCircle size={16} className="spin"/>:<RefreshCcw size={16}/>}
        {syncing?'Sincronizando...':pending.length?'Sincronizar '+pending.length+' pendente(s)':'Verificar novas ofertas'}
      </button>
    </div>
    {message&&<div className="mt-2"><Feedback type="success">{message}</Feedback></div>}
    {failure&&<div className="mt-2"><Feedback type="error">{failure}</Feedback></div>}
    <div className="mt-3" style={{borderTop:'1px solid var(--border, #334155)',paddingTop:12}}>
      <div className="flex between center wrap gap-2">
        <strong style={{fontSize:13}}>Pré-seleção para pesquisar primeiro</strong>
        <span className="micro">Prioridade editorial ≠ comprovação de vendas</span>
      </div>
      <div className="card-grid mt-2">
        {chatOffers.filter(o=>o.priority==='A').map(o=><div key={o.key} className="panel" style={{padding:12}}>
          <div className="micro">{o.niche}</div>
          <strong style={{display:'block',fontSize:13,marginTop:5}}>{o.name}</strong>
          <div className="flex between center gap-2 mt-2"><span style={{fontSize:12}}>{money(o)}</span>
            <span className="micro">{isPresent(o,products)?'No painel':'Importar'}</span></div>
        </div>)}
      </div>
      <button className="btn btn-ghost mt-3" type="button" onClick={()=>setExpanded(x=>!x)}>
        <BookOpenCheck size={16}/>{expanded?'Ocultar catálogo':'Ver todas as '+chatOffers.length+' ofertas'}
      </button>
      {expanded&&<div style={{marginTop:12,overflowX:'auto'}}>
        <table style={{width:'100%',fontSize:12,textAlign:'left',borderCollapse:'collapse'}}>
          <thead><tr><th style={{padding:8}}>Oferta</th><th style={{padding:8}}>Preço de referência</th><th style={{padding:8}}>Triagem</th><th style={{padding:8}}>Cadastro</th></tr></thead>
          <tbody>{chatOffers.map(o=><tr key={o.key} style={{borderTop:'1px solid var(--border, #334155)'}}>
            <td style={{padding:8}}>{o.name}<div className="flex wrap gap-2 mt-2">{o.url&&<a className="small-link" href={o.url} target="_blank" rel="noopener noreferrer">Página</a>}{o.marketplace&&<a className="small-link" href={o.marketplace} target="_blank" rel="noopener noreferrer">Oferta</a>}{metaSearchLinks(o).map(m=><a key={m.url} className="small-link" href={m.url} target="_blank" rel="noopener noreferrer">Meta: {m.label}</a>)}</div></td><td style={{padding:8}}>{money(o)}</td>
            <td style={{padding:8}}>Grupo {o.priority}</td>
            <td style={{padding:8}}>{isPresent(o,products)?'Salva':'Pendente'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <details className="advanced-details mt-3">
        <summary>Plano de análise e teste — 7 dias</summary>
        <div style={{fontSize:13,lineHeight:1.8,padding:'12px 4px'}}>
          <p><strong>Dia 1:</strong> completar links, país, preço, checkout e custos reais.</p>
          <p><strong>Dia 2:</strong> verificar anúncios individuais e registrar provas (sem presumir que anúncio ativo gera lucro).</p>
          <p><strong>Dias 3–4:</strong> testar uma oferta com criativo e página prontos, registrando gasto e resultados no Simulador.</p>
          <p><strong>Dias 5–6:</strong> testar a segunda oferta com orçamento e critérios equivalentes.</p>
          <p><strong>Dia 7:</strong> comparar CPC, cliques qualificados, inícios de checkout, compras, CPA e margem real; pausar ou iterar com base nos dados.</p>
        </div>
      </details>
      <p className="micro mt-2">As 3 pesquisas Meta de cada oferta são atalhos de busca, não IDs de anúncios. Ao abrir o painel com login, o catálogo completa registros anteriores; nenhum dado de concorrente é verificado em tempo real por esta função.</p>
    </div>
  </section>;
}
