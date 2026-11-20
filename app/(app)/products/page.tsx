'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowRight,BookOpenCheck,Download,FolderSearch,Globe2,Link2,LoaderCircle,Plus,Search,ShieldAlert,Trash2} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {Empty,Feedback,Load,Modal,PageHeading,StatusPill} from '@/components/ui';
import {ProductForm} from '@/components/forms';
import {downloadCsv,brl,opportunityScore} from '@/lib/utils';
import {productTypes} from '@/lib/types';

function nextStep(hasPage:boolean,hasPrice:boolean,adCount:number,hasAnalysis:boolean){
  if(!hasPage)return 'Adicionar o link da página de vendas';
  if(!hasPrice)return 'Informar o preço da oferta';
  if(!adCount)return 'Salvar um anúncio real da concorrência';
  if(!hasAnalysis)return 'Analisar os pontos fortes e os riscos';
  return 'Conferir o parecer e decidir o próximo teste';
}

export default function Products(){
  const {products,ads,loading,error,latestAnalysis,supabase,refresh}=useWorkspace();
  const [newOpen,setNewOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('all');
  const [type,setType]=useState('all');
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [failure,setFailure]=useState('');
  const filtered=useMemo(()=>products.filter(p=>
    (status==='all'||p.status===status)&&
    (type==='all'||p.product_type===type)&&
    (p.name+' '+p.niche+' '+p.notes).toLowerCase().includes(search.toLowerCase())
  ),[products,search,status,type]);
  const withAds=new Set(ads.map(a=>a.product_id)).size;
  const researching=products.filter(p=>p.status==='researching').length;
  const testing=products.filter(p=>p.status==='testing').length;

  async function eraseCatalog(){
    if(confirmation.trim().toUpperCase()!=='APAGAR'||deleting)return;
    setDeleting(true);setFailure('');setFeedback('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user)throw new Error('Sua sessão expirou. Faça login novamente.');
      // RLS e a condição por user_id impedem apagar registros de outras contas.
      // As FKs do schema removem anúncios, capturas, análises e testes relacionados.
      const creativePaths=[...new Set(ads.map(a=>a.creative_path).filter((x):x is string=>!!x))];
      const {data:removed,error:deleteError}=await supabase.from('products')
        .delete().eq('user_id',user.id).select('id');
      if(deleteError)throw deleteError;
      const {count,error:verifyError}=await supabase.from('products')
        .select('id',{count:'exact',head:true}).eq('user_id',user.id);
      if(verifyError)throw verifyError;
      if(count!==0)throw new Error('A limpeza ficou incompleta: ainda há ofertas no seu catálogo.');
      let leftovers=false;
      for(let i=0;i<creativePaths.length;i+=100){
        const {error:storageError}=await supabase.storage.from('creatives').remove(creativePaths.slice(i,i+100));
        if(storageError)leftovers=true;
      }
      await refresh();
      setDeleteOpen(false);setConfirmation('');setSearch('');setStatus('all');setType('all');
      setFeedback(String(removed?.length||0)+' oferta(s) excluída(s), incluindo anúncios, análises e testes relacionados.'+
        (leftovers?' Alguns arquivos de mídia podem precisar de limpeza manual.':''));
    }catch(err){
      setFailure(err instanceof Error?err.message:'Não foi possível limpar o catálogo.');
      await refresh();
    }finally{setDeleting(false);}
  }

  return <>
    <PageHeading eyebrow="ORGANIZE SUAS PESQUISAS" title="Minhas ofertas"
      description="Um lugar simples para salvar, entender e comparar ideias antes de investir."
      action={<>
        <Link href="/browser" className="btn btn-ghost"><Globe2 size={16}/> Pesquisar ofertas</Link>
        <button className="btn btn-primary" onClick={()=>setNewOpen(true)}><Plus size={17}/> Adicionar oferta</button>
      </>}/>

    <section className="offer-guide" aria-label="Como usar o Caçador">
      <div className="offer-guide-head">
        <div><span className="eyebrow">COMECE POR AQUI</span><h2>Da pesquisa até o teste, em 3 passos</h2></div>
        <Link className="small-link" href="/semana">Ver teste da semana <ArrowRight size={14}/></Link>
      </div>
      <div className="offer-steps">
        <div className="offer-step"><span className="offer-step-number">1</span><div><strong>Encontre uma oferta</strong><p>Pesquise na gringa ou no Brasil e salve o nome e o link da página.</p></div></div>
        <div className="offer-step"><span className="offer-step-number">2</span><div><strong>Confira as evidências</strong><p>Anote preço, promessa e anúncios reais. Anúncio ativo não significa lucro.</p></div></div>
        <div className="offer-step"><span className="offer-step-number">3</span><div><strong>Decida com critério</strong><p>Analise riscos, prepare um produto autoral e só então escolha um teste.</p></div></div>
      </div>
    </section>

    {error&&<div className="mb-2"><Feedback type="error">Não foi possível carregar todas as informações: {error}</Feedback></div>}
    {feedback&&<div className="mb-2"><Feedback type="success">{feedback}</Feedback></div>}
    {failure&&<div className="mb-2"><Feedback type="error">{failure}</Feedback></div>}

    {!loading&&<div className="offer-overview" aria-label="Resumo das ofertas">
      <div><span>Ofertas salvas</span><strong>{products.length}</strong></div>
      <div><span>Em pesquisa</span><strong>{researching}</strong></div>
      <div><span>Com anúncios</span><strong>{withAds}</strong></div>
      <div><span>Em teste</span><strong>{testing}</strong></div>
    </div>}

    <div className="offer-list-heading">
      <div><h2>Seu catálogo</h2><p className="muted">Abra uma oferta para ver o diagnóstico e o que falta fazer.</p></div>
      {products.length>0&&<div className="flex wrap gap-2">
        <button className="btn btn-ghost" onClick={()=>downloadCsv('ofertas-cacador.csv',
          ['Nome','Nicho','Tipo','Preço','Status','Página'],
          products.map(p=>[p.name,p.niche,p.product_type,p.sale_price,p.status,p.landing_url]))}>
          <Download size={15}/> Exportar CSV
        </button>
        <button className="btn btn-danger" onClick={()=>{setConfirmation('');setFailure('');setDeleteOpen(true);}}>
          <Trash2 size={15}/> Zerar catálogo
        </button>
      </div>}
    </div>

    <div className="offer-filters">
      <label className="search-box"><Search size={16}/><input className="input"
        aria-label="Pesquisar ofertas" placeholder="Pesquisar pelo nome ou nicho..."
        value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label className="offer-filter-field">Etapa
        <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">Todas as etapas</option>
          <option value="researching">Em pesquisa</option>
          <option value="ready">Prontas para avaliar</option>
          <option value="testing">Em teste</option>
          <option value="winning">Com resultado positivo</option>
          <option value="discarded">Descartadas</option>
        </select>
      </label>
      <details className="offer-more-filters"><summary>Mais filtros</summary>
        <label className="offer-filter-field">Tipo de produto
          <select className="select" value={type} onChange={e=>setType(e.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="digital">Digital</option>
            <option value="physical">Físico</option>
            <option value="saas">SaaS</option>
            <option value="service">Serviço</option>
          </select>
        </label>
      </details>
    </div>

    {loading?<Load/>:filtered.length===0?
      <div className="panel"><Empty icon={<FolderSearch size={28}/>}
        headline={products.length?'Nenhuma oferta encontrada':'Seu catálogo está vazio'}
        description={products.length?
          'Experimente remover os filtros para visualizar suas ofertas.':
          'Comece do zero: cadastre uma oferta que encontrou. Nenhuma oferta antiga será adicionada automaticamente.'}
        action={<button className="btn btn-primary" onClick={()=>setNewOpen(true)}><Plus size={16}/> Cadastrar primeira oferta</button>}/></div>
      :<div className="offer-card-grid">
        {filtered.map(p=>{
          const productAds=ads.filter(a=>a.product_id===p.id);
          const analysis=latestAnalysis(p.id);
          const score=opportunityScore(p,productAds,analysis);
          return <Link className="offer-card" href={'/products/'+p.id} key={p.id}>
            <div className="offer-card-top">
              <span className="card-tag">{productTypes[p.product_type]||'Produto'}</span>
              <StatusPill value={p.status}/>
            </div>
            <h3>{p.name}</h3>
            <p className="offer-card-promise">{p.promise||p.niche||'Promessa ainda não registrada'}</p>
            <div className="offer-card-details">
              <div><span>Preço informado</span><strong>{p.sale_price!==null?brl(p.sale_price,p.currency):'A verificar'}</strong></div>
              <div><span>Mercado</span><strong>{p.country||'A definir'}</strong></div>
              <div><span>Anúncios salvos</span><strong>{productAds.length}</strong></div>
            </div>
            <div className="offer-next"><BookOpenCheck size={17}/><div><span>PRÓXIMO PASSO</span><strong>{nextStep(!!p.landing_url,p.sale_price!==null,productAds.length,!!analysis)}</strong></div></div>
            <div className="offer-card-bottom">
              <span><Link2 size={14}/>{p.landing_url?'Página registrada':'Sem link da página'}</span>
              <span>Abrir dossiê <ArrowRight size={14}/></span>
            </div>
            <p className="offer-score-note">Sinal de pesquisa: {score.score}/100 · Não comprova vendas</p>
          </Link>;
        })}
      </div>}
    {!loading&&products.length>0&&<p className="offer-disclaimer"><ShieldAlert size={15}/> As notas são indicadores de pesquisa. Antes de anunciar, confirme a demanda, a entrega e os custos.</p>}

    {newOpen&&<Modal title="Cadastrar nova oferta" subtitle="Comece com nome e link. Complete os detalhes quando quiser."
      onClose={()=>setNewOpen(false)}><ProductForm onCancel={()=>setNewOpen(false)}
      onComplete={()=>setNewOpen(false)}/></Modal>}

    {deleteOpen&&<Modal title="Zerar todas as ofertas" subtitle="Esta ação é permanente e afeta somente os registros da sua conta."
      onClose={()=>{if(!deleting){setDeleteOpen(false);setConfirmation('');}}}>
      <div className="offer-delete-body">
        <div className="feedback error"><ShieldAlert size={19}/><span>Serão excluídas as {products.length} ofertas, seus anúncios, capturas, análises e testes vinculados. Não será possível desfazer.</span></div>
        <label className="field">Digite APAGAR para confirmar
          <input className="input" autoFocus value={confirmation} onChange={e=>setConfirmation(e.target.value)}
            placeholder="APAGAR" disabled={deleting}/>
        </label>
        {failure&&<Feedback type="error">{failure}</Feedback>}
        <div className="form-actions">
          <button className="btn btn-ghost" disabled={deleting} onClick={()=>{setDeleteOpen(false);setConfirmation('');}}>Cancelar</button>
          <button className="btn btn-danger" disabled={deleting||confirmation.trim().toUpperCase()!=='APAGAR'}
            onClick={()=>void eraseCatalog()}>{deleting?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>}
            {deleting?'Excluindo...':'Excluir todas as ofertas'}</button>
        </div>
      </div>
    </Modal>}
  </>;
}
