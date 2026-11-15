'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Check,ClipboardCopy,Download,ExternalLink,FileCode2,
  LoaderCircle,Monitor,Plus,Save,Smartphone,Sparkles,Trash2} from 'lucide-react';
import {useWorkspace} from '@/components/workspace';
import {Feedback,Load,PageHeading} from '@/components/ui';
import {brl,safeHttpUrl} from '@/lib/utils';
import {readSalesDraft,salesPageHtml,serializeSalesDraft,starterPage,
  type SalesPageDraft} from '@/lib/sales-page';

type Tone='direta'|'profissional'|'acolhedora';
const lines=(values:string[],limit:number)=>values.slice(0,limit).join('\n');
const splitLines=(value:string,limit:number)=>value.split(/\r?\n/).slice(0,limit);
function EditField({label,value,onChange,large=false,placeholder='',maxLength=400}:{
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
  const {products,ads,supabase,refresh,loading}=useWorkspace();
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
    setCheckout(p.checkout_url);
  },[p,ownAds]);
  const html=useMemo(()=>{
    if(!p||!draft)return '';
    return salesPageHtml(draft,{name:p.name,price:p.sale_price,currency:p.currency,checkout});
  },[p,draft,checkout]);
  function change(key:string,value:string){
    setDraft(prev=>prev?{...prev,[key]:value}:prev);
    setSuccess('');
  }
  function changeLines(key:'benefits'|'includes'|'steps',value:string,limit:number){
    setDraft(prev=>prev?{...prev,[key]:splitLines(value,limit)}:prev);
    setSuccess('');
  }
  function changeFaq(i:number,key:'question'|'answer',value:string){
    setDraft(prev=>prev?{...prev,faq:prev.faq.map((item,index)=>
      index===i?{...item,[key]:value}:item)}:prev);
    setSuccess('');
  }
  async function generate(){
    if(!p)return;
    setError('');setSuccess('');setGenerating(true);
    try{
      const res=await fetch('/api/remodel-page',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({productId:p.id,competitorCopy:referenceCopy.slice(0,7000),
          differentiation:differentiation.slice(0,2500),
          actualContents:actualContents.slice(0,3500),tone})});
      const result=await res.json();
      if(!res.ok)throw new Error(result.error||'Não foi possível gerar a copy.');
      setDraft({...result.draft,
        accent:draft?.accent||'#12b886',
        imageUrl:draft?.imageUrl||''});
      setAiModel(result.model||'');
      setSuccess('Copy nova gerada. Revise os fatos, itens incluídos e o checkout antes de publicar.');
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
      if(checkout.trim()&&!safeHttpUrl(checkout))throw new Error('O link de checkout deve iniciar com https:// ou http://.');
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
    {error&&<div className="mb-2"><Feedback type="error">{error}</Feedback></div>}
    {success&&<div className="mb-2"><Feedback type="success">{success}</Feedback></div>}
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
          <button className="btn btn-primary wide mt-3" onClick={()=>void generate()} disabled={generating}>
            {generating?<LoaderCircle size={17} className="spin"/>:<Sparkles size={17}/>}
            {generating?'Gerando copy original...':'Gerar nova página com IA'}
          </button>
          <button className="btn wide mt-2" onClick={resetToStarter}>
            <FileCode2 size={16}/> Criar modelo base sem IA
          </button>
          {aiModel&&<p className="micro mt-2">Modelo utilizado: {aiModel}</p>}
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
          <label className="field" style={{marginBottom:14}}>Cor principal
            <input className="input" type="color" value={/^#[0-9a-f]{6}$/i.test(draft.accent)?draft.accent:'#12b886'}
              onChange={e=>change('accent',e.target.value)} style={{height:48,padding:5}}/>
          </label>
          <EditField label="Link do NOSSO checkout (não use o do concorrente)"
            value={checkout} onChange={setCheckout} placeholder="https://meu-checkout.com/..."/>
          {!checkout.trim()&&<div className="risk-tip">Checkout não cadastrado. Os botões de compra da prévia ficarão desabilitados.</div>}
        </div>
      </div>
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
