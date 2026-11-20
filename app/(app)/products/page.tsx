'use client';
import Link from 'next/link';
import {useMemo,useState,type FormEvent} from 'react';
import {ArrowRight,BookOpenCheck,ChartNoAxesCombined,CheckCircle2,Download,ExternalLink,FolderSearch,Globe2,LoaderCircle,Plus,Search,ShieldAlert,Sparkles,Trash2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useWorkspace} from '@/components/workspace';
import {isPrintableOffer} from '@/lib/printable-eligibility';
import {Load,Modal} from '@/components/ui';
import {downloadCsv,brl,safeHttpUrl} from '@/lib/utils';
import {comparableUrl,digitalFormats,digitalNiches,digitalRadar,formatLabel,formatTag,isResearchBreakdown,resolveFormatId,markets,metaDiscoveryUrl} from '@/lib/digital-radar';
import type {Product,Ad} from '@/lib/types';
import type {DigitalRadar} from '@/lib/digital-radar';
import {Creative} from '@/components/creative';
import {firstAdWithImage,offerLibraryUrl,creativeStoragePaths} from '@/lib/library-links';
import {normalizeOfferUrl,metaSearchUrlForWebsite} from '@/lib/meta-search';
import styles from './radar.module.css';

type Filter='all'|'priority'|'check'|'ads'|'testing';
const defaultMarket=markets[0];

function suggestedName(url:string){
  try{
    const host=new URL(url).hostname.replace(/^www\./,'');
    return 'Oferta de '+host.slice(0,120);
  }catch{return 'Oferta digital para pesquisar';}
}
function normalized(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}


function OfferCard({product:p,radar,related}:{product:Product;radar:DigitalRadar;related:Ad[]}){
  const visual=firstAdWithImage(related);
  const library=offerLibraryUrl(p,related);
  const siteSearch=metaSearchUrlForWebsite(p.landing_url);
  const country=p.country?.trim()||'';
  const market=!country?'🌍 Gringa':country==='Brasil'?'🇧🇷 Brasil':'🌍 '+country;
  return (
    <article className={styles.card+(p.weekly_pick?' '+styles.cardPick:'')}>
      {visual&&<div className={styles.cardCreative}><Creative ad={visual}/></div>}
      <div className={styles.cardHead}>
        {p.weekly_pick&&<span className={styles.chip+' '+styles.chipPick}>Escolha da semana</span>}
        <span className={styles.chip}>{market} · Digital</span>
        <span className={styles.chip+' '+(radar.score>=63?styles.chipGood:styles.chipNeutral)}>{radar.label}</span>
      </div>
      <h3>{p.name}</h3>
      <p className={styles.cardDescription}>{p.promise||p.niche||'Ainda sem descrição da promessa'}</p>
      <div className={styles.cardFacts}>
        <div><span>Formato</span><strong>{formatLabel(p)}</strong></div>
        <div><span>Preço de referência</span><strong>{p.sale_price!==null?brl(p.sale_price,p.currency):'Não informado'}</strong></div>
        <div><span>Anúncios salvos</span><strong>{related.length}</strong></div>
        <div><span>Facilidade</span><strong>{radar.effort}</strong></div>
      </div>
      <div>
        <div className={styles.progressHead}><span>Nota de triagem</span><strong>{radar.score}/100</strong></div>
        <div className={styles.progressTrack} role="meter" aria-label="Nota de triagem"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={radar.score}>
          <div className={styles.progressFill} style={{width:radar.score+'%'}}/>
        </div>
      </div>
      <div className={styles.nextBox}><span>PRÓXIMO PASSO</span><strong>{radar.next}</strong></div>
      <div className={styles.cardActions}>
        <Link className={styles.secondary} href={'/products/'+p.id}><BookOpenCheck size={15}/> Ver análise</Link>
        <Link className={styles.primary} href={'/products/'+p.id+'/remodelar'}><Sparkles size={15}/> Criar versão própria</Link>
        {library&&<a className={styles.secondary+' '+styles.libraryAction} href={library} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Biblioteca</a>}
        {siteSearch&&<a className={styles.secondary+' '+styles.libraryAction} href={siteSearch} target="_blank" rel="noopener noreferrer"><Search size={15}/> Pesquisar link na Meta</a>}
      </div>
      <p className={styles.cardFoot}>{radar.confidence}. A nota não confirma vendas, autorização de uso ou adequação jurídica.</p>
    </article>
  );
}

export default function Products(){
  const router=useRouter();
  const {products,ads,analyses,loading,error,supabase,refresh}=useWorkspace();
  const [link,setLink]=useState('');
  const [name,setName]=useState('');
  const [niche,setNiche]=useState('');
  const [market,setMarket]=useState<string>(defaultMarket.code);
  const [format,setFormat]=useState('printable');
  const [price,setPrice]=useState('');
  const [saving,setSaving]=useState(false);
  const [failure,setFailure]=useState('');
  const [feedback,setFeedback]=useState('');
  const [discoveryNiche,setDiscoveryNiche]=useState<string>(digitalNiches[0].name);
  const [discoveryMarket,setDiscoveryMarket]=useState('US');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [formatFilter,setFormatFilter]=useState('all');
  const [countryFilter,setCountryFilter]=useState('all');
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [confirmation,setConfirmation]=useState('');
  const [deleting,setDeleting]=useState(false);

  const digital=useMemo(()=>products.filter(isPrintableOffer),[products]);
  const offers=useMemo(()=>digital.map(p=>{
    const related=ads.filter(ad=>ad.product_id===p.id);
    const research=analyses.find(a=>a.product_id===p.id&&a.kind==='product'&&(a.model==='Grok Bot'||isResearchBreakdown(a.breakdown)));
    const analysis=research??analyses.find(a=>a.product_id===p.id&&a.kind==='product');
    return {product:p,ads:related,radar:digitalRadar(p,related,analysis)};
  }).sort((a,b)=>Number(b.product.weekly_pick)-Number(a.product.weekly_pick)||
    b.radar.score-a.radar.score||
    new Date(b.product.created_at).getTime()-new Date(a.product.created_at).getTime()),[digital,ads,analyses]);
  const filtered=useMemo(()=>offers.filter(o=>{
    const p=o.product;
    const query=normalized(search.trim());
    const matchSearch=!query||normalized([p.name,p.niche,p.country,p.promise,p.notes].join(' ')).includes(query);
    const matchFormat=formatFilter==='all'||resolveFormatId(p)===formatFilter;
    const matchCountry=countryFilter==='all'||p.country===countryFilter;
    const matchStage=filter==='all'||
      (filter==='priority'&&o.radar.score>=63)||
      (filter==='check'&&o.radar.score<63)||
      (filter==='ads'&&o.radar.hasEvidence)||
      (filter==='testing'&&p.status==='testing');
    return matchSearch&&matchFormat&&matchCountry&&matchStage;
  }),[offers,filter,search,formatFilter,countryFilter]);
  const withAds=offers.filter(x=>x.radar.hasEvidence).length;
  const priority=offers.filter(x=>x.radar.score>=63).length;
  const inTest=offers.filter(x=>x.product.status==='testing').length;
  const discoveryLink=metaDiscoveryUrl(discoveryNiche,discoveryMarket);

  async function saveOffer(e:FormEvent){
    e.preventDefault();setFailure('');setFeedback('');
    if(saving)return;
    const clean=normalizeOfferUrl(link);
    if(!clean){setFailure('Informe um domínio válido, como tafeljoy.shop/de/. O https:// é opcional.');return;}
    const duplicate=products.find(p=>comparableUrl(p.landing_url)===comparableUrl(clean));
    if(duplicate){setFeedback('Essa página já está cadastrada. Abrindo o dossiê existente.');
      router.push('/products/'+duplicate.id);return;}
    if(price.trim()!==''&&(!Number.isFinite(Number(price))||Number(price)<0)){
      setFailure('Confira o preço: informe um número positivo ou deixe vazio.');return;
    }
    setSaving(true);
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user)throw new Error('Faça login novamente para salvar.');
      const m=markets.find(x=>x.code===market)||defaultMarket;
      const value={
        user_id:user.id,
        name:name.trim().slice(0,150)||suggestedName(clean),
        product_type:'digital',niche,country:m.country,language:m.language,currency:m.currency,
        sale_price:price.trim()?Number(price):null,
        fulfillment_cost:null,extra_cost:null,
        landing_url:clean,checkout_url:'',landing_copy:'',promise:'',target_audience:'',
        notes:[formatTag(format),'Fonte: página de referência cadastrada manualmente.','Validação de anúncios e demanda pendente.'].filter(Boolean).join('\n'),
        format:format||'',difficulty:'',weekly_pick:false,
        status:'researching'
      };
      const {data,error:saveError}=await supabase.from('products').insert(value).select('id').single();
      if(saveError)throw saveError;
      await refresh();
      router.push('/products/'+data.id);
    }catch(err){
      setFailure(err instanceof Error?err.message:'Não foi possível cadastrar a oferta.');
    }finally{setSaving(false);}
  }

  async function eraseCatalog(){
    if(confirmation.trim().toUpperCase()!=='APAGAR'||deleting)return;
    setDeleting(true);setFailure('');setFeedback('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user)throw new Error('Sua sessão expirou. Faça login novamente.');
      // O banco usa RLS e cascade; a cláusula por dono é uma proteção adicional.
      const media=[...new Set(ads.flatMap(creativeStoragePaths))];
      const {data:deleted,error:deleteError}=await supabase.from('products')
        .delete().eq('user_id',user.id).select('id');
      if(deleteError)throw deleteError;
      const {count,error:checkError}=await supabase.from('products')
        .select('id',{head:true,count:'exact'}).eq('user_id',user.id);
      if(checkError)throw checkError;
      if(count!==0)throw new Error('Ainda existem ofertas no banco. A limpeza não foi concluída.');
      let mediaError=false;
      for(let i=0;i<media.length;i+=100){
        const {error:storageError}=await supabase.storage.from('creatives').remove(media.slice(i,i+100));
        if(storageError)mediaError=true;
      }
      await refresh();
      setDeleteOpen(false);setConfirmation('');setFilter('all');setSearch('');
      setFormatFilter('all');setCountryFilter('all');
      setFeedback((deleted?.length||0)+' oferta(s) excluída(s).'+
        (mediaError?' Algumas mídias antigas podem precisar de limpeza manual.':''));
    }catch(err){
      setFailure(err instanceof Error?err.message:'Falha ao excluir ofertas.');
      await refresh();
    }finally{setDeleting(false);}
  }

  return <div className={styles.root}>
    <header className={styles.heading}>
      <div>
        <div className={styles.kicker}>CAÇADOR.IA · RADAR DE PRODUTOS DIGITAIS</div>
        <h1>Encontre, avalie e remodele ofertas digitais</h1>
        <p>Descubra ideias na gringa, registre as referências e escolha onde vale investir seu tempo.</p>
      </div>
      <div className={styles.headingActions}>
        <Link href="/semana" className={styles.secondary}><ChartNoAxesCombined size={16}/> Decidir teste da semana</Link>
      </div>
    </header>

    {error&&<div className={styles.error} role="alert">Não foi possível carregar todos os dados: {error}</div>}
    {failure&&<div className={styles.error} role="alert">{failure}</div>}
    {feedback&&<div className={styles.success} role="status">{feedback}</div>}

    <section className={styles.hero} aria-label="Cadastro rápido de oferta digital">
      <div>
        <div className={styles.kicker}>01 · SALVE UMA REFERÊNCIA</div>
        <h2>Cole o link da oferta que encontrou</h2>
        <p>Não precisa preencher um formulário enorme. Salve uma página da gringa e complemente as informações depois.</p>
        <form className={styles.quickForm} onSubmit={e=>void saveOffer(e)}>
          <label className={styles.inputGroup}>Link da página de vendas *
            <input className={styles.input} type="text" inputMode="url" required value={link} onChange={e=>setLink(e.target.value)}
              placeholder="tafeljoy.shop/de/ (https:// opcional)" autoComplete="url"/>
          </label>
          <label className={styles.inputGroup}>Nome da oferta (opcional)
            <input className={styles.input} type="text" maxLength={150} value={name}
              onChange={e=>setName(e.target.value)} placeholder="Ex.: Biblioteca de atividades para idosos"/>
          </label>
          <div className={styles.rowFields}>
            <label className={styles.inputGroup}>Nicho
              <select className={styles.select} value={niche} onChange={e=>setNiche(e.target.value)}>
                <option value="">Escolher depois</option>
                {digitalNiches.map(n=><option key={n.name} value={n.name}>{n.name}</option>)}
              </select>
            </label>
            <label className={styles.inputGroup}>País da referência
              <select className={styles.select} value={market} onChange={e=>setMarket(e.target.value)}>
                {markets.map(m=><option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </label>
            <label className={styles.inputGroup}>Formato do produto
              <select className={styles.select} value={format} onChange={e=>setFormat(e.target.value)}>
                <option value="">Descobrir depois</option>
                {digitalFormats.filter(f=>f.id==='printable').map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
            <label className={styles.inputGroup}>Preço no país de origem (opcional)
              <input className={styles.input} type="number" min="0" step=".01" value={price}
                onChange={e=>setPrice(e.target.value)}
                placeholder={'Ex.: 19.90 ('+(markets.find(m=>m.code===market)?.currency||'USD')+')'}/>
            </label>
          </div>
          <div className={styles.formFooter}>
            <button className={styles.primary} type="submit" disabled={saving}>
              {saving?<LoaderCircle size={17} className="spin"/>:<Plus size={17}/>}
              {saving?'Salvando...':'Salvar e abrir análise'} <ArrowRight size={15}/>
            </button>
            <small>O cadastro não copia nem verifica automaticamente o conteúdo da página.</small>
          </div>
        </form>
      </div>
      <aside className={styles.heroAside}>
        <div className={styles.processCard}>
          <h3>Seu processo de remodelagem</h3>
          <div className={styles.processStep}><b className={styles.number}>1</b><div><strong>Encontrar</strong><span>Use os links de pesquisa para descobrir ofertas digitais no exterior.</span></div></div>
          <div className={styles.processStep}><b className={styles.number}>2</b><div><strong>Validar</strong><span>Guarde preço, proposta, anúncios individuais e riscos da oferta.</span></div></div>
          <div className={styles.processStep}><b className={styles.number}>3</b><div><strong>Criar a sua versão</strong><span>Produza entregáveis originais e uma página própria, adequada ao Brasil.</span></div></div>
        </div>
        <div className={styles.rule}><ShieldAlert size={15} style={{verticalAlign:'middle',marginRight:6}}/>
          O radar avalia informação disponível e esforço provável. Não tem acesso às vendas dos concorrentes.</div>
      </aside>
    </section>

    <section className={styles.discovery} aria-label="Pesquisar ideias para produtos digitais">
      <div className={styles.sectionTitle}>
        <div><div className={styles.kicker}>02 · ENCONTRE OFERTAS NA GRINGA</div>
          <h2>Pesquisar oportunidades na Biblioteca de Anúncios</h2>
          <p>Escolha nicho e mercado. O botão abre uma busca com palavras-chave no idioma do país.</p>
        </div>
        <Link href="/browser" className={styles.quiet}><Globe2 size={16}/> Navegador do Caçador</Link>
      </div>
      <div className={styles.discoveryControls}>
        <label className={styles.inputGroup}>O que você quer pesquisar?
          <select className={styles.select} value={discoveryNiche} onChange={e=>setDiscoveryNiche(e.target.value)}>
            {digitalNiches.map(n=><option key={n.name} value={n.name}>{n.name}</option>)}
          </select>
        </label>
        <label className={styles.inputGroup}>País dos anúncios
          <select className={styles.select} value={discoveryMarket} onChange={e=>setDiscoveryMarket(e.target.value)}>
            {markets.map(m=><option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.discoveryAction}>
        <a className={styles.primary} href={discoveryLink} target="_blank" rel="noopener noreferrer">
          <Search size={16}/> Abrir pesquisa de anúncios <ExternalLink size={15}/>
        </a>
        <p className={styles.disclaimer}><ShieldAlert size={14}/> É uma busca externa, não uma lista de produtos vencedores. Verifique cada anúncio e a página original antes de salvar.</p>
      </div>
    </section>

    {!loading&&<div className={styles.metrics} aria-label="Resumo de ofertas digitais">
      <div className={styles.metric}><span>Ofertas digitais</span><strong>{digital.length}</strong></div>
      <div className={styles.metric}><span>Para investigar primeiro</span><strong>{priority}</strong></div>
      <div className={styles.metric}><span>Com anúncio identificado</span><strong>{withAds}</strong></div>
      <div className={styles.metric}><span>Em teste</span><strong>{inTest}</strong></div>
    </div>}

    <section className={styles.catalog}>
      <div className={styles.catalogTop}>
        <div>
          <div className={styles.kicker}>03 · COMPARE AS OPORTUNIDADES</div>
          <h2>Melhores candidatas para investigar</h2>
          <p>Ordenadas por informação disponível e facilidade de produção.</p>
        </div>
        <div className={styles.catalogButtons}>
          <button className={styles.quiet} type="button" onClick={() => downloadCsv('ofertas-digitais.csv',
            ['Nome','Nicho','Preço','Página','Nota'],
            offers.map(o => [o.product.name,o.product.niche,o.product.sale_price,o.product.landing_url,o.radar.score]))}>
            <Download size={15}/> Exportar
          </button>
          <button className={styles.danger} type="button" disabled={products.length===0}
            onClick={() => {setDeleteOpen(true);setConfirmation('');}}>
            <Trash2 size={15}/> Zerar catálogo
          </button>
        </div>
      </div>
      <div className={styles.tabs}>
        <button className={filter==='all'?styles.tabActive:styles.tab} onClick={() => setFilter('all')}>Todas</button>
        <button className={filter==='priority'?styles.tabActive:styles.tab} onClick={() => setFilter('priority')}>Investigar primeiro</button>
        <button className={filter==='check'?styles.tabActive:styles.tab} onClick={() => setFilter('check')}>Precisam de dados</button>
        <button className={filter==='ads'?styles.tabActive:styles.tab} onClick={() => setFilter('ads')}>Com anúncios</button>
        <button className={filter==='testing'?styles.tabActive:styles.tab} onClick={() => setFilter('testing')}>Em teste</button>
      </div>
      <div className={styles.filters}>
        <label className={styles.filterLabel}>Buscar
          <input className={styles.input} value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Nome, nicho ou país"/>
        </label>
        <label className={styles.filterLabel}>Formato
          <select className={styles.select} value={formatFilter} onChange={e=>setFormatFilter(e.target.value)}>
            <option value="all">Todos</option>
            {digitalFormats.filter(f=>f.id==='printable').map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label className={styles.filterLabel}>País
          <select className={styles.select} value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}>
            <option value="all">Todos os países</option>
            {markets.map(m=><option key={m.code} value={m.country}>{m.country}</option>)}
          </select>
        </label>
      </div>
      <p className={styles.resultsInfo}>{filtered.length} oferta(s) · Ranking de pesquisa, não de vendas.</p>
      {loading && <Load/>}
      {!loading && filtered.length===0 && <div className={styles.empty}>
        <FolderSearch size={30}/>
        <h3>Comece salvando uma oferta digital</h3>
        <p>Cole uma página no formulário acima ou altere os filtros para ver as ofertas.</p>
        <button type="button" className={styles.secondary}
          onClick={() => {setFilter('all');setFormatFilter('all');setCountryFilter('all');setSearch('');}}>
          Limpar filtros
        </button>
      </div>}
      {!loading && filtered.length!==0 && <div className={styles.cards}>
        {filtered.map(o => <OfferCard key={o.product.id} product={o.product} radar={o.radar} related={o.ads}/>)}
      </div>}
    </section>

    {deleteOpen&&<Modal title="Zerar todo o catálogo" subtitle="Atenção: a limpeza também inclui ofertas de outros tipos."
      onClose={()=>{if(!deleting){setDeleteOpen(false);setConfirmation('');}}}>
      <div className={styles.deleteDialog}>
        <p>Esta ação apaga {products.length} oferta(s) da sua conta, com anúncios, análises, históricos e testes relacionados. Não poderá ser desfeita.</p>
        <label className={styles.inputGroup}>Digite APAGAR para confirmar
          <input className={styles.input} autoFocus value={confirmation} disabled={deleting}
            onChange={e=>setConfirmation(e.target.value)} placeholder="APAGAR"/>
        </label>
        {failure&&<div className={styles.error} role="alert">{failure}</div>}
        <div className={styles.dialogActions}>
          <button className={styles.secondary} disabled={deleting}
            onClick={()=>{setDeleteOpen(false);setConfirmation('');}}>Cancelar</button>
          <button className={styles.danger} disabled={deleting||confirmation.trim().toUpperCase()!=='APAGAR'}
            onClick={()=>void eraseCatalog()}>
            {deleting?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>}
            {deleting?'Excluindo...':'Apagar todas as ofertas'}
          </button>
        </div>
      </div>
    </Modal>}
  </div>;
}
