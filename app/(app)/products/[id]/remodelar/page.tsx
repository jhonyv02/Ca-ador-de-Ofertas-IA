'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Check,ClipboardCopy,Download,ExternalLink,FileCode2,
  LoaderCircle,Monitor,Plus,Save,Smartphone,Sparkles,Trash2} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {Feedback,Load,PageHeading} from '@/components/ui';
import {brl,safeHttpUrl} from '@/lib/utils';
import {pageWinnerCandidates,suggestedWinner} from '@/lib/page-winner';
import {readSalesDraft,salesPageHtml,serializeSalesDraft,starterPage,
  type SalesPageDraft} from '@/lib/sales-page';
import {AUTO_VISUAL_LABELS} from '@/lib/sales-page-visuals';

type Tone='direta'|'profissional'|'acolhedora';
const lines=(values:string[],limit:number)=>values.slice(0,limit).join('\n');
const splitLines=(value:string,limit:number)=>value.split(/\r?\n/).slice(0,limit);
function EditField({label,value,onChange,large=false,placeholder='',maxLength=large?1000:400}:{
  label:string;value:string;onChange:(value:string)=>void;large?:boolean;placeholder?:string;maxLength?:number
}){
  return <label className="field" style={{marginBottom:14}}>{label}
    {large?<textarea className="textarea" rows={3} maxLength={maxLength} value={value}
      onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>:
      <input className="input" value={value} maxLength={maxLength}
        onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>}
  </label>;
}
export default function RemodelPage(){
  const {id}=useParams<{id:string}>();
  const {products,ads,testRuns,supabase,refresh,loading}=useWorkspace();
  const p=products.find(x=>x.id===id);
  const ownAds=ads.filter(a=>a.product_id===id);
  const initialized=useRef<string|null>(null);
  const [draft,setDraft]=useState<SalesPageDraft|null>(null);
  const [referenceCopy,setReferenceCopy]=useState('');
  const [differentiation,setDifferentiation]=useState('');
  const [actualContents,setActualContents]=useState('');
  const [tone,setTone]=useState<Tone>('direta');
  const [checkout,setCheckout]=useState('');
  const [viewport,setViewport]=useState<'mobile'|'desktop'>('mobile');
  const [generating,setGenerating]=useState(false);
  const [extracting,setExtracting]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [aiModel,setAiModel]=useState('');
  const [championMode,setChampionMode]=useState<'auto'|'manual'|'none'>('auto');
  const [championProductId,setChampionProductId]=useState('');
  const [autoImages,setAutoImages]=useState(false);
  const [imageBusy,setImageBusy]=useState(false);
  const [imageProgress,setImageProgress]=useState(0);
  const [winnerNotice,setWinnerNotice]=useState('');
  const candidates=useMemo(()=>pageWinnerCandidates(products,testRuns),[products,testRuns]);
  const best=useMemo(()=>suggestedWinner(products,testRuns),[products,testRuns]);
  useEffect(()=>{
    if(!p||initialized.current===p.id)return;
    initialized.current=p.id;
    const restored=readSalesDraft(p.landing_copy);
    setDraft(restored||starterPage(p));
    setReferenceCopy(restored?.referenceCopy||
      (restored?'':p.landing_copy.slice(0,5000))||
      ownAds.map(a=>[a.hook,a.ad_copy].filter(Boolean).join('\n')).filter(Boolean).join('\n\n').slice(0,5000));
    setDifferentiation(restored?.differentiation||'');
    setActualContents(restored?.actualContents||'');
    setCheckout(restored?p.checkout_url:'');
  },[p,ownAds]);
  const html=useMemo(()=>{
    if(!p||!draft)return '';
    return salesPageHtml(draft,{name:p.name,price:p.sale_price,currency:p.currency,checkout});
  },[p,draft,checkout]);
  function change(key:string,value:string){
    setDraft(prev=>prev?{...prev,[key]:value}:prev);
    setSuccess('');
  }
  function changeLines(key:'benefits'|'includes'|'steps'|'secondPlanItems'|'painPoints',value:string,limit:number){
    setDraft(prev=>prev?{...prev,[key]:splitLines(value,limit)}:prev);
    setSuccess('');
  }
  function changeFaq(i:number,key:'question'|'answer',value:string){
    setDraft(prev=>prev?{...prev,faq:prev.faq.map((item,index)=>
      index===i?{...item,[key]:value}:item)}:prev);
    setSuccess('');
  }
  async function createVisual(kind:'hero'|'preview'|'gallery',contents=actualContents,existing?:SalesPageDraft,slot?:number){
    if(!p)return null;
    const res=await fetch('/api/sales-visual',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({productId:p.id,kind,slot,contents:contents.slice(0,1800),
        label:kind==='hero'?(existing?.brand||p.name):kind==='gallery'?
          AUTO_VISUAL_LABELS[(slot??0)+1]||'Mockup ilustrativo':'Prévia ilustrativa do kit digital'})});
    const result=await res.json();
    if(!res.ok)throw new Error(result.error||'Falha ao gerar imagem.');
    return result.url as string;
  }
  async function generateImages(){
    if(!draft||!p)return;
    setImageBusy(true);setError('');setSuccess('');
    try{
      const url=await createVisual('hero',actualContents,draft);
      const second=await createVisual('preview',actualContents,draft);
      setDraft(prev=>prev?{...prev,imageUrl:url||prev.imageUrl,
        gallery:[...(prev.gallery||[]).slice(0,2),
          {label:'Mockup ilustrativo do material',url:second||''}]}:prev);
      setSuccess('Mockups gerados. São imagens ilustrativas: revise antes de publicar e salve o rascunho.');
    }catch(e){
      setError(e instanceof Error?e.message:'A geração de imagens falhou. Você pode usar os mockups visuais do HTML.');
    }finally{setImageBusy(false);}
  }
  async function generateTenImages(){
    if(!p||!draft||imageBusy)return;
    if(!confirm('Esta operação gera 10 imagens com a API de imagens e consome créditos pagos. Os 15 mockups ilustrativos gratuitos já aparecem no HTML. Deseja gerar as imagens pagas?'))return;
    if((draft.gallery||[]).some(item=>item.url)&&
      !confirm('Existem imagens cadastradas. Deseja substituir as primeiras 10 imagens da galeria?'))return;
    setError('');setSuccess('');setImageBusy(true);setImageProgress(0);
    let done=0;
    try{
      for(let i=0;i<10;i++){
        const url=await createVisual('gallery',actualContents,draft,i);
        if(!url)throw new Error('A imagem '+(i+1)+' não retornou uma URL válida.');
        setDraft(prev=>{
          if(!prev)return prev;
          const gallery=Array.from({length:Math.max(10,prev.gallery?.length||0)},(_,j)=>
            prev.gallery?.[j]||{label:AUTO_VISUAL_LABELS[j+1]||'Prévia do produto',url:''});
          gallery[i]={label:AUTO_VISUAL_LABELS[i+1]||'Prévia do produto',url};
          return {...prev,gallery};
        });
        done++;
        setImageProgress(done);
      }
      setSuccess('As 10 imagens foram geradas e vinculadas à galeria. Revise as imagens e clique em Salvar rascunho. As imagens são conceituais, não amostras reais dos arquivos.');
    }catch(e){
      setError('Geração interrompida após '+done+'/10 imagens. '+(e instanceof Error?e.message:'Falha na API.')+
        ' As que foram concluídas continuam na galeria. Os mockups gratuitos completam os espaços vazios.');
    }finally{setImageBusy(false);}
  }
  function applyReferenceTemplate(style:'clinic'|'editorial'){
    setDraft(prev=>prev?{
      ...prev,visualStyle:style,accent:style==='clinic'?'#2a9d8f':'#e5b853',
      gallery:Array.from({length:Math.max(10,prev.gallery?.length||0)},(_,i)=>
        prev.gallery?.[i]||{label:AUTO_VISUAL_LABELS[i+1]||'Prévia do material',url:''})
    }:prev);
    setError('');setSuccess(style==='clinic'?
      'Modelo Consultório: galeria de rolagem infinita, vídeo, dores, prova real, kit, bônus e planos.':
      'Modelo Agenda: hero escura, depoimentos, galeria com setas, passos, conteúdo, bônus e planos.');
  }
  function moveSection(key:NonNullable<SalesPageDraft['sectionOrder']>[number],direction:number){
    setDraft(prev=>{
      if(!prev)return prev;
      const order:NonNullable<SalesPageDraft['sectionOrder']>=prev.sectionOrder?.length
        ?prev.sectionOrder:['pain','benefits','mockups','includes','steps','faq'];
      const index=order.indexOf(key),next=index+direction;
      if(index<0||next<0||next>=order.length)return prev;
      const copy=[...order];[copy[index],copy[next]]=[copy[next],copy[index]];
      return {...prev,sectionOrder:copy};
    });
  }
  async function generate(){
    if(!p)return;
    setError('');setSuccess('');setGenerating(true);
    try{
      const res=await fetch('/api/remodel-page',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({productId:p.id,competitorCopy:referenceCopy.slice(0,7000),
          differentiation:differentiation.slice(0,2500),
          actualContents:actualContents.slice(0,3500),tone,
          pageStyle:draft?.visualStyle==='clinic'?'clinic':draft?.visualStyle==='editorial'?'editorial':'classic',championMode,championProductId:championMode==='manual'?championProductId:undefined})});
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||'Não foi possível gerar a copy.');
      const nextDraft:SalesPageDraft={...result.draft,
        imageUrl:draft?.imageUrl||'',
        gallery:draft?.gallery||[],
        proofItems:draft?.proofItems||[],
        bonusItems:draft?.bonusItems||[],
        proofTitle:draft?.proofTitle||'O que dizem nossos clientes',
        bonusTitle:draft?.bonusTitle||'Bônus incluídos no pacote',
        pricingTitle:draft?.pricingTitle||'Escolha sua opção',
        ownOfferPrice:draft?.ownOfferPrice||'',painPoints:draft?.painPoints||[],
        guaranteeText:draft?.guaranteeText||'',
        secondPlanName:draft?.secondPlanName||'',
        secondPlanPrice:draft?.secondPlanPrice||'',
        secondPlanCheckout:draft?.secondPlanCheckout||'',
        secondPlanItems:draft?.secondPlanItems||[]};
      setDraft(nextDraft);
      setAiModel(result.model||'');
      setWinnerNotice(result.championNotice||'');
      setSuccess('Nova copy e blocos visuais gerados. Revise tudo antes de publicar.');
      if(autoImages){
        setImageBusy(true);
        try{
          const hero=await createVisual('hero',actualContents,nextDraft);
          setDraft(prev=>prev?{...prev,imageUrl:hero||prev.imageUrl}:prev);
          const preview=await createVisual('preview',actualContents,nextDraft);
          setDraft(prev=>prev?{...prev,gallery:[...(prev.gallery||[]).slice(0,2),
            {label:'Imagem conceitual do material',url:preview||''}]}:prev);
          setSuccess('Página e 2 imagens conceituais geradas. Verifique a entrega real e salve.');
        }catch(e){
          setError((e instanceof Error?e.message:'Falha na geração de imagem.')+
            ' A página foi criada com mockups 3D em CSS mesmo assim.');
        }finally{setImageBusy(false);}
      }
    }catch(e){setError(e instanceof Error?e.message:'Erro ao gerar a página.');}
    finally{setGenerating(false);}
  }
  async function extractReference(){
    if(!p||!p.landing_url)return;
    if(referenceCopy.trim()&&!confirm('Substituir o texto de referência atual pelo conteúdo encontrado no link?'))return;
    setExtracting(true);setError('');setSuccess('');
    try{
      const res=await fetch('/api/extract-reference',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({productId:p.id})});
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||'Não foi possível ler este site.');
      setReferenceCopy(result.text);
      setSuccess('Texto público extraído. Revise e use apenas como referência; a copy nova será original.');
    }catch(e){setError(e instanceof Error?e.message:'Site bloqueou a leitura. Cole o texto manualmente.');}
    finally{setExtracting(false);}
  }
  function applyEditorialTemplate(){
    setDraft(prev=>prev?{...prev,visualStyle:'editorial',accent:'#e5b853',
      proofTitle:prev.proofTitle||'O que dizem nossos clientes',
      bonusTitle:prev.bonusTitle||'Bônus incluídos no pacote completo',
      pricingTitle:prev.pricingTitle||'Escolha sua opção',
      galleryTitle:prev.galleryTitle||'Veja como o material funciona por dentro'}:prev);
    setError('');setSuccess('Modelo azul-marinho e dourado aplicado! Veja o resultado na prévia.');
  }
  function resetToStarter(){
    if(!p)return;
    if(draft&&!confirm('Substituir a copy atual pelo modelo inicial? O último rascunho salvo continuará no sistema até você salvar novamente.'))return;
    setDraft(starterPage(p));
    setSuccess('Modelo inicial criado. Personalize as informações do produto.');
    setError('');
  }
  async function save(){
    if(!p||!draft)return;
    setSaving(true);setError('');setSuccess('');
    try{
      if(checkout.trim()&&!safeHttpUrl(checkout).startsWith('https://'))throw new Error('Para vender com segurança, use um checkout com HTTPS.');
      const value=serializeSalesDraft({...draft,
        referenceCopy:referenceCopy.slice(0,3500),
        differentiation:differentiation.slice(0,1800),
        actualContents:actualContents.slice(0,2500)});
      const {error:dbErr}=await supabase.from('products')
        .update({landing_copy:value,checkout_url:safeHttpUrl(checkout)})
        .eq('id',p.id).eq('user_id',p.user_id);
      if(dbErr)throw dbErr;
      await refresh();
      setSuccess('Rascunho salvo no seu produto. Para vender, exporte o HTML e publique a página no seu domínio.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o rascunho.');}
    finally{setSaving(false);}
  }
  function download(){
    if(!p||!html)return;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const u=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=u;
    a.download='pagina-vendas-'+p.name.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'.html';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),500);
    setSuccess(checkout.trim()?'HTML baixado. Publique no domínio escolhido e teste o checkout no celular.':
      'HTML baixado como rascunho; configure o checkout antes de anunciar.');
  }
  async function copy(){
    try{await navigator.clipboard.writeText(html);setSuccess('Código HTML copiado.');setError('');}
    catch{setError('Seu navegador não permitiu copiar. Use o botão Baixar HTML.');}
  }
  if(loading)return <Load/>;
  if(p&&!draft)return <Load/>;
  if(!p||!draft)return <>
    <PageHeading title="Oferta não encontrada" description="Volte para a lista e abra um produto cadastrado."/>
    <Link className="btn" href="/products">Voltar aos produtos</Link>
  </>;
  const referenceUrl=p.landing_url;
  const hasExternalReference=referenceUrl&&referenceUrl!==checkout;
  return <>
    <Link href={'/products/'+p.id} className="small-link mb-2"><ArrowLeft size={15}/> Voltar ao dossiê</Link>
    <PageHeading eyebrow="ESTÚDIO DE PÁGINAS · TRÁFEGO DIRETO" title="Remodelar página de vendas"
      description="Estude os argumentos do concorrente, produza uma copy própria e veja o resultado primeiro no celular."
      action={<div className="flex wrap gap-2">
        <button className="btn" onClick={()=>void save()} disabled={saving}>
          {saving?<LoaderCircle size={15} className="spin"/>:<Save size={15}/>}
          {saving?'Salvando...':'Salvar rascunho'}
        </button>
        <button className="btn btn-primary" onClick={download}><Download size={15}/> Baixar HTML</button>
      </div>}/>
    <div className="info-note mb-2">
      <strong>Produto novo e autoral:</strong> a concorrência é referência de dores, público e posicionamento;
      a IA cria texto próprio, sem copiar parágrafos, depoimentos ou imagens. Não é necessário ter
      licença para revender o produto do concorrente porque não vamos revendê-lo.
      A entrega do nosso novo produto precisa existir antes de subir tráfego.
    </div>
    <section className="panel" style={{border:'1px solid #ddbc70',background:'linear-gradient(125deg,#142744,#0c182e)',color:'#fff'}}>
      <div className="flex between wrap center gap-3">
        <div style={{maxWidth:650}}>
          <div style={{fontSize:11,letterSpacing:2,color:'#efcc79',fontWeight:800}}>NOVO MODELO VISUAL · REFERÊNCIA ENVIADA</div>
          <h2 style={{fontSize:21,margin:'9px 0'}}>2 modelos completos, 15 visuais e carrosséis</h2>
          <p style={{fontSize:13,color:'#e4e9f1',lineHeight:1.7,margin:0}}>
            Escolha entre a página estilo Agenda Católica (azul e dourado) e Consultório Lúdico
            (verde-água e bege). Ambos incluem 15 mockups ilustrativos grátis, galerias, cards, bônus,
            planos e FAQ — tudo responsivo e editável.
          </p>
        </div>
        <div className="flex wrap gap-2">
          <button className="btn" style={{background:'#e5b853',color:'#13233c',fontWeight:800}}
            onClick={()=>applyReferenceTemplate('editorial')}>Usar modelo Agenda Católica</button>
          <button className="btn" style={{background:'#2a9d8f',color:'#fff',fontWeight:800}}
            onClick={()=>applyReferenceTemplate('clinic')}>Usar modelo Consultório Lúdico</button>
        </div>
      </div>
      <p style={{fontSize:11,color:'#cdd7e6',marginTop:12}}>
        Os 15 mockups SVG estão incluídos no HTML gratuitamente.
        Avaliações, bônus e garantia só aparecem quando forem preenchidos com dados reais.
      </p>
    </section>
    {error&&<div className="mb-2"><Feedback type="error">{error}</Feedback></div>}
    {success&&<div className="mb-2"><Feedback type="success">{success}</Feedback></div>}
    <section className="panel">
      <h2 style={{fontSize:19,marginBottom:7}}>Página campeã: escolher a estrutura de referência</h2>
      <p className="muted" style={{fontSize:13}}>
        O Caçador compara resultados cadastrados por produto, não por versão de página.
        A referência automática só é sugerida com pelo menos 40 cliques, 2 vendas e rascunho salvo.
      </p>
      {best?<div className="info-note mt-2">
        <strong>Melhor referência com dados suficientes: {best.name}</strong>
        <p style={{marginTop:6}}>{best.sales} venda(s) / {best.clicks} cliques · Conversão aproximada de cliques em compras: {((best.conversionRate||0)*100).toFixed(2)}% ·
        CPA: {best.cpa===null?'não disponível':brl(best.cpa)}. Isso não prova qual bloco causou a conversão.</p>
      </div>:<div className="info-note mt-2">
        Nenhuma página própria possui amostra suficiente para eleger uma campeã. Você pode escolher manualmente um rascunho salvo ou gerar um modelo novo.
      </div>}
      <label className="field mt-3">Usar como inspiração da ordem e estilo dos blocos
        <select className="input" value={championMode}
          onChange={e=>setChampionMode(e.target.value as 'auto'|'manual'|'none')}>
          <option value="auto">Escolher automaticamente por dados reais</option>
          <option value="manual">Escolher minha página de referência</option>
          <option value="none">Não usar campeã — criar nova estrutura</option>
        </select>
      </label>
      {championMode==='manual'&&<label className="field mt-2">Página salva nesta conta
        <select className="input" value={championProductId} onChange={e=>setChampionProductId(e.target.value)}>
          <option value="">Selecione uma página para referência</option>
          {candidates.map(c=><option value={c.productId} key={c.productId}>
            {c.name} · {c.sales} vendas / {c.clicks} cliques {c.reliable?'(amostra mínima atingida)':''}
          </option>)}
        </select>
      </label>}
      <p className="micro mt-2">
        A IA herda a hierarquia, ordem e cor da página própria selecionada; cria textos e mockups originais para a nova oferta.
        Nunca transfere depoimentos, provas ou imagens do outro produto.
      </p>
    </section>
    <section className="panel">
      <div className="flex between center wrap gap-2">
        <div><h2 style={{fontSize:19,marginBottom:7}}>1. Referências para criar a nossa versão</h2>
          <p className="muted" style={{fontSize:12,margin:0}}>
            Produto: {p.name} · {p.niche} · Preço cadastrado: {p.sale_price===null?'A confirmar':brl(p.sale_price,p.currency)}
          </p>
        </div>
        {hasExternalReference&&<div className="flex gap-2 wrap">
          <button className="btn btn-primary" onClick={()=>void extractReference()} disabled={extracting}>
            {extracting?<LoaderCircle size={15} className="spin"/>:<Sparkles size={15}/>}
            {extracting?'Lendo página...':'Ler copy do link'}
          </button>
          <a className="btn btn-ghost" href={referenceUrl} target="_blank" rel="noopener noreferrer">
            Abrir referência <ExternalLink size={15}/></a>
        </div>}
      </div>
      <div className="two-col mt-3">
        <div>
          <EditField label="Copy, ganchos e argumentos do concorrente (cole aqui)" large maxLength={7000}
            value={referenceCopy} onChange={v=>setReferenceCopy(v.slice(0,7000))}
            placeholder="Cole o texto da página ou do anúncio. A IA usa somente os argumentos gerais, sem reproduzir o texto."/>
          <EditField label="Nosso diferencial real" large maxLength={2500} value={differentiation}
            onChange={v=>setDifferentiation(v.slice(0,2500))}
            placeholder="Qual será a diferença do nosso produto original?"/>
          <EditField label="O que já existe no NOSSO produto (entregáveis confirmados)" large maxLength={3500}
            value={actualContents} onChange={v=>setActualContents(v.slice(0,3500))}
            placeholder="Ex.: 30 fichas próprias revisadas, arquivo PDF, guia de uso... Não inclua o que ainda não está pronto."/>
        </div>
        <div>
          <label className="field">Tom da nossa página
            <select className="input" value={tone} onChange={e=>setTone(e.target.value as Tone)}>
              <option value="direta">Direta e objetiva</option>
              <option value="profissional">Profissional e confiável</option>
              <option value="acolhedora">Acolhedora e didática</option>
            </select>
          </label>
          <div className="info-note mt-2">
            A IA considera as copies de anúncios já salvos e o texto de referência. O botão Ler copy consulta apenas o HTML público do link; páginas com bloqueio ou conteúdo carregado por JavaScript podem exigir colagem manual.
          </div>
          <label className="flex center gap-2 mt-3" style={{fontSize:13}}>
            <input type="checkbox" checked={autoImages} onChange={e=>setAutoImages(e.target.checked)}/>
            Gerar 2 imagens adicionais por IA (opcional, consome créditos da API)
          </label>
          <button className="btn btn-primary wide mt-3" onClick={()=>void generate()}
            disabled={generating||imageBusy||(championMode==='manual'&&!championProductId)}>
            {generating?<LoaderCircle size={17} className="spin"/>:<Sparkles size={17}/>}
            {generating?'Gerando página e mockups...':'Gerar página no estilo da campeã + mockups'}
          </button>
          <button className="btn wide mt-2" onClick={resetToStarter}>
            <FileCode2 size={16}/> Criar modelo base sem IA
          </button>
          {aiModel&&<p className="micro mt-2">Modelo utilizado: {aiModel}</p>}
          {winnerNotice&&<p className="micro mt-2">{winnerNotice}</p>}
        </div>
      </div>
    </section>
    <section className="panel">
      <h2 style={{fontSize:19}}>2. Ajuste e personalize a nova copy</h2>
      <p className="muted" style={{fontSize:12,marginTop:8}}>
        Tudo é editável antes de exportar. A página tem seções curtas, letras legíveis e CTA fixo no celular.
      </p>
      <div className="two-col mt-3">
        <div>
          <EditField label="Marca do NOSSO produto" value={draft.brand} onChange={v=>change('brand',v)}/>
          <EditField label="Chamada curta acima do título" value={draft.eyebrow} onChange={v=>change('eyebrow',v)}/>
          <EditField label="Título principal (primeira dobra)" value={draft.headline} onChange={v=>change('headline',v)}/>
          <EditField label="Subtítulo principal" large value={draft.subheadline} onChange={v=>change('subheadline',v)}/>
          <EditField label="Título da dor" value={draft.painTitle} onChange={v=>change('painTitle',v)}/>
          <EditField label="Explicação da dor" large value={draft.painBody} onChange={v=>change('painBody',v)}/>
          <EditField label="Título dos benefícios" value={draft.benefitsTitle} onChange={v=>change('benefitsTitle',v)}/>
          <EditField label="Benefícios (uma frase por linha)" large value={lines(draft.benefits,6)}
            onChange={v=>changeLines('benefits',v,6)}/>
          <EditField label="Título do que está incluído" value={draft.offerTitle} onChange={v=>change('offerTitle',v)}/>
          <EditField label="Entregáveis REAIS (uma frase por linha)" large value={lines(draft.includes,8)}
            onChange={v=>changeLines('includes',v,8)}/>
        </div>
        <div>
          <EditField label="Título dos passos" value={draft.stepsTitle} onChange={v=>change('stepsTitle',v)}/>
          <EditField label="Passos (um por linha)" large value={lines(draft.steps,5)}
            onChange={v=>changeLines('steps',v,5)}/>
          <EditField label="Texto do botão CTA" value={draft.ctaText} onChange={v=>change('ctaText',v)}/>
          <EditField label="Título de fechamento" value={draft.finalTitle} onChange={v=>change('finalTitle',v)}/>
          <EditField label="Copy de fechamento" large value={draft.finalBody} onChange={v=>change('finalBody',v)}/>
                    <EditField label="Imagem do NOSSO produto (URL pública HTTPS, opcional)"
            value={draft.imageUrl} onChange={v=>change('imageUrl',v)} placeholder="https://.../mockup.png"/>
          <button className="btn wide mt-2" onClick={()=>void generateImages()} disabled={imageBusy||generating}>
            {imageBusy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}
            {imageBusy?'Criando 2 imagens...':'Gerar 2 imagens originais com IA'}
          </button>
          <p className="micro mt-2">Mockups são ilustrações e não comprovam a existência ou o resultado do material.
            O botão usa saldo da API e requer o bucket público sales-page-assets configurado no Supabase.</p>
          <label className="field" style={{marginBottom:14}}>Cor principal
            <input className="input" type="color" value={/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:'#12b886'}
              onChange={e=>change('accent',e.target.value)} style={{height:48,padding:5}}/>
          </label>
          <EditField label="Link do NOSSO checkout (não use o do concorrente)"
            value={checkout} onChange={setCheckout} placeholder="https://meu-checkout.com/..."/>
          {!checkout.trim()&&<div className="risk-tip">Checkout não cadastrado. Os botões de compra da prévia ficarão desabilitados.</div>}
        </div>
      </div>
      <details className="advanced-details mt-3" open>
        <summary>Editar mockups, imagens e ordem dos blocos</summary>
        <div style={{padding:16}}>
          <label className="field">Estilo visual
            <select className="input" value={draft.visualStyle||'dark'}
              onChange={e=>change('visualStyle',e.target.value)}>
              <option value="dark">Escuro moderno</option>
              <option value="light">Claro profissional</option>
              <option value="warm">Quente editorial</option>
              <option value="editorial">Agenda Católica: azul-marinho + dourado, galeria com setas</option>
              <option value="clinic">Consultório Lúdico: teal + bege, carrossel infinito</option>
            </select>
          </label>
          <EditField label="Título da galeria de mockups" value={draft.galleryTitle||''}
            onChange={v=>change('galleryTitle',v)} />
          {(draft.visualStyle==='editorial'||draft.visualStyle==='clinic')
            ?<div className="info-note mt-3">A ordem dos blocos acompanha a referência escolhida.
              Consultório: hero → rolagem de imagens → demonstração → dores → benefícios → depoimentos reais → conteúdo → bônus → planos → garantia → FAQ → CTA.
              Agenda: hero → depoimentos reais → dores → galeria com setas → uso → recursos → bônus → planos → garantia → FAQ → CTA.
            </div>
            :<>
          <div className="micro mt-3">ORDEM DOS BLOCOS — os mockups 3D aparecem mesmo sem fotografias</div>
          {(draft.sectionOrder||['pain','benefits','mockups','includes','steps','faq']).map((section,i)=>(
            <div key={section} className="flex between center gap-2 mt-2" style={{padding:'8px 0'}}>
              <span style={{fontSize:13}}>{i+1}. {({pain:'Problema',benefits:'Benefícios',
                mockups:'Mockups e imagens',includes:'Conteúdo e preço',steps:'Como funciona',
                faq:'Perguntas frequentes'} as Record<string,string>)[section]}</span>
              <div className="flex gap-2">
                <button className="btn" disabled={i===0} onClick={()=>moveSection(section,-1)}>↑</button>
                <button className="btn" disabled={i===(draft.sectionOrder||[]).length-1} onClick={()=>moveSection(section,1)}>↓</button>
              </div>
            </div>
          ))}
            </>}
          <div className="micro mt-3">GALERIA — 15 imagens ilustrativas grátis aparecem automaticamente. Links HTTPS informados aqui substituem os visuais correspondentes.</div>
          <button className="btn mt-2" onClick={()=>void generateTenImages()} disabled={imageBusy||generating}>
            {imageBusy?<LoaderCircle size={15} className="spin"/>:<Sparkles size={15}/>}
            {imageBusy?'Gerando imagem '+imageProgress+'/10...':'Gerar 10 imagens com IA (usa créditos pagos)'}
          </button>
          <p className="micro mt-2">É opcional. O HTML já contém 15 imagens SVG gratuitas e diferentes, mesmo sem usar a API.</p>
          <EditField label="Vídeo demonstrativo (YouTube/Vimeo HTTPS, opcional)"
            value={draft.demoVideoUrl||''} onChange={v=>change('demoVideoUrl',v)}
            placeholder="https://www.youtube.com/watch?v=..."/>
          <EditField label="Faixa superior (somente texto verdadeiro, sem escassez inventada)"
            value={draft.topRibbon||''} onChange={v=>change('topRibbon',v)}
            placeholder="Ex.: CONTEÚDO DIGITAL · MATERIAL AUTORAL"/>
          {(draft.gallery||[]).map((entry,i)=><div className="panel mt-2" key={i} style={{padding:12}}>
            <EditField label={'Legenda '+(i+1)} value={entry.label} onChange={v=>setDraft(prev=>
              prev?{...prev,gallery:(prev.gallery||[]).map((g,n)=>n===i?{...g,label:v}:g)}:prev)}/>
            <EditField label="URL pública da imagem" value={entry.url} onChange={v=>setDraft(prev=>
              prev?{...prev,gallery:(prev.gallery||[]).map((g,n)=>n===i?{...g,url:v}:g)}:prev)}/>
            <button className="btn btn-danger" onClick={()=>setDraft(prev=>
              prev?{...prev,gallery:(prev.gallery||[]).filter((_,n)=>n!==i)}:prev)}>
              <Trash2 size={14}/> Remover imagem
            </button>
          </div>)}
          <button className="btn mt-2" disabled={(draft.gallery||[]).length>=15}
            onClick={()=>setDraft(prev=>prev?{...prev,gallery:[...(prev.gallery||[]),
              {label:'Imagem do produto',url:''}]}:prev)}>
            <Plus size={15}/> Adicionar imagem
          </button>
        </div>
      </details>
      {(draft.visualStyle==='editorial'||draft.visualStyle==='clinic')&&<details className="advanced-details mt-3" open>
        <summary>Blocos extras do modelo: depoimentos, bônus, planos e garantia</summary>
        <div style={{padding:16}}>
          <p className="micro">Estes blocos são opcionais. Eles aparecem na página publicada somente depois de você cadastrar informações verdadeiras e verificadas.</p>
          <EditField label="Dores reais do público (uma por linha)" large
            value={lines(draft.painPoints||[],4)}
            onChange={v=>changeLines('painPoints',v,4)}/>
          <EditField label="Título dos depoimentos" value={draft.proofTitle||''} onChange={v=>change('proofTitle',v)}/>
          <div className="micro mt-3">DEPOIMENTOS REAIS — não gerar avaliações fictícias</div>
          {(draft.proofItems||[]).map((item,i)=><div className="panel mt-2" key={i} style={{padding:12}}>
            <EditField label={'Depoimento '+(i+1)} large value={item.quote}
              onChange={v=>setDraft(prev=>prev?{...prev,proofItems:(prev.proofItems||[]).map((p,j)=>i===j?{...p,quote:v}:p)}:prev)}/>
            <EditField label="URL HTTPS do print real do WhatsApp (opcional)" value={item.imageUrl||''}
              onChange={v=>setDraft(prev=>prev?{...prev,proofItems:(prev.proofItems||[]).map((p,j)=>i===j?{...p,imageUrl:v}:p)}:prev)}
              placeholder="https://.../print-autorizado.webp"/>
            <EditField label="Autor autorizado" value={item.author}
              onChange={v=>setDraft(prev=>prev?{...prev,proofItems:(prev.proofItems||[]).map((p,j)=>i===j?{...p,author:v}:p)}:prev)}/>
            <button className="btn btn-danger" onClick={()=>setDraft(prev=>prev?{...prev,proofItems:(prev.proofItems||[]).filter((_,j)=>j!==i)}:prev)}>
              <Trash2 size={14}/> Remover</button>
          </div>)}
          <button className="btn mt-2" disabled={(draft.proofItems||[]).length>=6}
            onClick={()=>setDraft(prev=>prev?{...prev,proofItems:[...(prev.proofItems||[]),{quote:'',author:'',imageUrl:''}]}:prev)}>
            <Plus size={15}/> Adicionar depoimento verificado
          </button>
          <div style={{borderTop:'1px solid var(--border,#334155)',margin:'22px 0'}}/>
          <EditField label="Título da seção de bônus" value={draft.bonusTitle||''}
            onChange={v=>change('bonusTitle',v)}/>
          <div className="micro">BÔNUS EFETIVAMENTE ENTREGUES</div>
          {(draft.bonusItems||[]).map((item,i)=><div className="panel mt-2" key={i} style={{padding:12}}>
            <EditField label={'Nome do bônus '+(i+1)} value={item.title}
              onChange={v=>setDraft(prev=>prev?{...prev,bonusItems:(prev.bonusItems||[]).map((b,j)=>j===i?{...b,title:v}:b)}:prev)}/>
            <EditField label="Descrição (o que está incluído)" large value={item.description}
              onChange={v=>setDraft(prev=>prev?{...prev,bonusItems:(prev.bonusItems||[]).map((b,j)=>j===i?{...b,description:v}:b)}:prev)}/>
            <EditField label="URL da imagem do bônus (HTTPS, opcional)" value={item.imageUrl||''}
              onChange={v=>setDraft(prev=>prev?{...prev,bonusItems:(prev.bonusItems||[]).map((b,j)=>j===i?{...b,imageUrl:v}:b)}:prev)}/>
            <button className="btn btn-danger" onClick={()=>setDraft(prev=>prev?{...prev,bonusItems:(prev.bonusItems||[]).filter((_,j)=>j!==i)}:prev)}>
              <Trash2 size={14}/> Remover</button>
          </div>)}
          <button className="btn mt-2" disabled={(draft.bonusItems||[]).length>=6}
            onClick={()=>setDraft(prev=>prev?{...prev,bonusItems:[...(prev.bonusItems||[]),{title:'',description:'',imageUrl:''}]}:prev)}>
            <Plus size={15}/> Adicionar bônus existente
          </button>
          <div style={{borderTop:'1px solid var(--border,#334155)',margin:'22px 0'}}/>
          <EditField label="Título dos planos/preços" value={draft.pricingTitle||''} onChange={v=>change('pricingTitle',v)}/>
          <EditField label="PREÇO DO SEU PRODUTO (não é o preço do concorrente)"
            value={draft.ownOfferPrice||''} onChange={v=>change('ownOfferPrice',v)}
            placeholder="Ex.: R$ 19,90"/>

          <p className="micro">A opção principal usa o preço do cadastro do produto e o checkout configurado acima.
            Só ofereça uma segunda opção quando existir um segundo produto ou plano real.</p>
          <EditField label="Segundo plano (opcional)" value={draft.secondPlanName||''}
            onChange={v=>change('secondPlanName',v)} placeholder="Ex.: Pacote completo"/>
          <EditField label="Preço real do segundo plano" value={draft.secondPlanPrice||''}
            onChange={v=>change('secondPlanPrice',v)} placeholder="Ex.: R$ 27,90"/>
          <EditField label="Checkout HTTPS do segundo plano" value={draft.secondPlanCheckout||''}
            onChange={v=>change('secondPlanCheckout',v)} placeholder="https://seu-checkout-do-segundo-plano"/>
          <EditField label="Itens reais do segundo plano (um por linha)" large
            value={lines(draft.secondPlanItems||[],8)}
            onChange={v=>changeLines('secondPlanItems',v,8)}/>
          <div style={{borderTop:'1px solid var(--border,#334155)',margin:'22px 0'}}/>
          <EditField label="Garantia comprovada (deixe vazio se não existir)" large
            value={draft.guaranteeText||''} maxLength={500}
            onChange={v=>change('guaranteeText',v)}
            placeholder="Informe somente a garantia que você realmente oferece e cumpre."/>
          <p className="micro">Não há bônus, depoimentos ou garantia inventados pela IA. Se os campos ficarem vazios, os blocos não aparecem na página exportada.</p>
        </div>
      </details>}
      <details className="advanced-details">
          <summary>Editar perguntas frequentes (sem inventar garantias)</summary>
          <div style={{padding:16}}>
            {draft.faq.map((q,i)=><div className="panel" key={i}>
              <EditField label={'Pergunta '+(i+1)} value={q.question} onChange={v=>changeFaq(i,'question',v)}/>
              <EditField label="Resposta" large value={q.answer} onChange={v=>changeFaq(i,'answer',v)}/>
              <button className="btn btn-danger" onClick={()=>setDraft(prev=>prev?{...prev,faq:prev.faq.filter((_,index)=>index!==i)}:prev)}>
                <Trash2 size={15}/> Remover
              </button>
            </div>)}
            <button className="btn" disabled={draft.faq.length>=6} onClick={()=>
              setDraft(prev=>prev?{...prev,faq:[...prev.faq,{question:'Nova pergunta',answer:'Escreva uma resposta confirmada.'}]}:prev)}>
              <Plus size={15}/> Adicionar FAQ
            </button>
          </div>
      </details>
    </section>
    <section className="panel">
      <div className="flex between center wrap gap-2">
        <div><h2 style={{fontSize:19}}>3. Prévia real da página</h2>
          <p className="muted" style={{fontSize:12,margin:'7px 0 0'}}>
            O HTML é responsivo e tem botão fixo apenas no celular. Verifique também em 320px.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={viewport==='mobile'?'btn btn-primary':'btn'} onClick={()=>setViewport('mobile')}>
            <Smartphone size={15}/> Celular
          </button>
          <button className={viewport==='desktop'?'btn btn-primary':'btn'} onClick={()=>setViewport('desktop')}>
            <Monitor size={15}/> Computador
          </button>
        </div>
      </div>
      <div style={{background:'#080d18',border:'1px solid #30475e',borderRadius:15,
        padding:viewport==='mobile'?'18px 5px':'12px',overflowX:'auto',marginTop:18}}>
        <iframe title="Prévia da página original de vendas" srcDoc={html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          style={{width:viewport==='mobile'?390:'100%',minWidth:viewport==='mobile'?320:700,
            maxWidth:'100%',height:760,background:'#fff',border:'1px solid #405267',
            borderRadius:viewport==='mobile'?24:8,display:'block',margin:'auto'}}/>
      </div>
      <div className="flex wrap gap-2 mt-3">
        <button className="btn btn-primary" onClick={()=>void save()} disabled={saving}>
          {saving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>}
          Salvar no Caçador
        </button>
        <button className="btn" onClick={download}><Download size={16}/> Baixar página HTML</button>
        <button className="btn btn-ghost" onClick={()=>void copy()}><ClipboardCopy size={16}/> Copiar código</button>
      </div>
      <div className="info-note mt-3">
        <strong>Antes de anunciar:</strong> este editor salva o rascunho e exporta um arquivo HTML responsivo.
        Ele não publica automaticamente o arquivo no seu domínio. Depois de publicar, atualize
        o endereço da sua página no cadastro, teste checkout, entrega e o evento Purchase da Meta.
        Não use o endereço da página do concorrente como página sua.
      </div>
    </section>
  </>;
}
