'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Camera,Check,ExternalLink,Globe2,
  Keyboard,LoaderCircle,MousePointer2,RefreshCcw,Save,Search,
  Smartphone,Monitor,ChevronUp,ChevronDown,XCircle} from 'lucide-react';
import {Feedback,PageHeading} from '@/components/ui';
import {useWorkspace} from '@/components/workspace';

type Frame={sessionId:string;url:string;title:string;image:string;width:number;height:number};
type Status={configured:boolean;online?:boolean;message?:string};
type Imported={productId:string;alreadyExists:boolean;screenshotUrl?:string;warning?:string;
  extracted?:{title:string;price:number|null;currency:string;url:string;visiblePrices:string};
  partialScreenshot?:boolean};
export default function BrowserPage(){
  const {refresh}=useWorkspace();
  const [status,setStatus]=useState<Status|null>(null);
  const [frame,setFrame]=useState<Frame|null>(null);
  const [address,setAddress]=useState('https://');
  const [keyboard,setKeyboard]=useState('');
  const [mobile,setMobile]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [imported,setImported]=useState<Imported|null>(null);
  const swipeStart=useRef<number|null>(null);
  const justSwiped=useRef(false);
  const wheelAt=useRef(0);
  useEffect(()=>{
    let alive=true;
    fetch('/api/browser',{cache:'no-store'})
      .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível verificar a conexão.');return data;})
      .then(data=>{if(alive)setStatus(data);})
      .catch(e=>{if(alive){setStatus({configured:false,message:e.message});}});
    return ()=>{alive=false;};
  },[]);
  async function run(command:string,payload:Record<string,unknown>={}){
    if(busy)return;
    setBusy(command);setError('');setSuccess('');
    try{
      const res=await fetch('/api/browser',{method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({command,sessionId:command==='open'?undefined:frame?.sessionId,
          ...(command==='open'?{mobile}:{}),...payload})});
      const data=await res.json();
      if(!res.ok)throw Error(data.error||'Falha na navegação.');
      if(command==='close'){
        setFrame(null);setImported(null);
        setSuccess('Navegador encerrado. A sessão temporária foi descartada.');
      }else if(command==='capture'){
        setImported(data as Imported);
        await refresh();
        setSuccess(data.alreadyExists?
          'A oferta já estava cadastrada. Uma nova captura foi registrada.':
          'Oferta importada para o Caçador. Agora você pode analisar e modelar a página.');
      }else{
        setFrame(data as Frame);
        if(data.url)setAddress(data.url);
        setImported(null);
      }
    }catch(e){setError(e instanceof Error?e.message:'A ação não pôde ser concluída.');}
    finally{setBusy('');}
  }
  function go(){
    const u=address.trim();
    if(!u.startsWith('https://')){setError('Use o endereço completo com https://');return;}
    void run(frame?'navigate':'open',{url:u});
  }
  function click(event:React.MouseEvent<HTMLImageElement>){
    if(!frame||busy||justSwiped.current)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=Math.round((event.clientX-rect.left)*frame.width/rect.width);
    const y=Math.round((event.clientY-rect.top)*frame.height/rect.height);
    void run('click',{x,y});
  }
  function finishSwipe(event:React.TouchEvent<HTMLImageElement>){
    if(swipeStart.current===null)return;
    const dist=swipeStart.current-event.changedTouches[0].clientY;
    swipeStart.current=null;
    if(Math.abs(dist)>=30){
      justSwiped.current=true;
      void run('scroll',{delta:Math.round(Math.max(-1200,Math.min(1200,dist*2)))});
      setTimeout(()=>{justSwiped.current=false;},350);
    }
  }
  function wheel(e:React.WheelEvent<HTMLImageElement>){
    if(!frame||busy||Math.abs(e.deltaY)<6||Date.now()-wheelAt.current<520)return;
    wheelAt.current=Date.now();
    void run('scroll',{delta:Math.max(-1100,Math.min(1100,Math.round(e.deltaY)))});
  }
  return <>
    <PageHeading eyebrow="PESQUISA VISUAL · NAVEGADOR INTERATIVO"
      title="Navegador de Ofertas"
      description="Explore páginas dentro do Caçador. Quando encontrar uma boa oferta, capture e salve o print, preço de referência e links no seu dossiê."/>
    <div className="info-note mb-2">
      Navegação por imagens atualizadas a cada ação, não vídeo contínuo.
      Para usar gratuitamente, o navegador precisa estar ligado à VPS existente.
      Não digite senhas, dados bancários ou informações privadas neste navegador de pesquisa.
      Algumas páginas podem impedir capturas ou exigir login.
    </div>
    {error&&<div className="mb-2"><Feedback type="error">{error}</Feedback></div>}
    {success&&<div className="mb-2"><Feedback type="success">{success}</Feedback></div>}
    {status&&!status.configured&&<div className="mb-2">
      <Feedback type="info">
        {status.message||'Serviço ainda não configurado.'}
        O código da interface está disponível; a VPS precisa executar o navegador Playwright.
      </Feedback>
    </div>}
    {status?.configured&&!status.online&&<div className="mb-2">
      <Feedback type="error">{status.message||'Serviço indisponível na VPS.'}</Feedback>
    </div>}
    <section className="panel" style={{padding:16}}>
      <div className="flex gap-2 wrap center" style={{marginBottom:12}}>
        <Globe2 size={18}/>
        <input className="input" aria-label="Endereço da oferta" style={{flex:'1 1 240px',minWidth:180}}
          value={address} onChange={e=>setAddress(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')go();}}
          placeholder="https://pagina-de-vendas.com"/>
        <button className="btn btn-primary" onClick={go}
          disabled={!!busy||status?.online!==true}>
          {busy?<LoaderCircle size={16} className="spin"/>:<Search size={16}/>}
          {frame?'Visitar':'Abrir navegador'}
        </button>
      </div>
      <div className="flex gap-2 wrap center" style={{marginBottom:14}}>
        <button className="btn" disabled={!frame||!!busy} onClick={()=>void run('back')} title="Voltar">
          <ArrowLeft size={16}/></button>
        <button className="btn" disabled={!frame||!!busy} onClick={()=>void run('forward')} title="Avançar">
          <ArrowRight size={16}/></button>
        <button className="btn" disabled={!frame||!!busy} onClick={()=>void run('refresh')} title="Atualizar">
          <RefreshCcw size={16}/></button>
        <button className="btn" disabled={!!busy} onClick={()=>{setMobile(true);void run('open',{mobile:true});}}>
          <Smartphone size={16}/> Celular</button>
        <button className="btn" disabled={!!busy} onClick={()=>{setMobile(false);void run('open',{mobile:false});}}>
          <Monitor size={16}/> Computador</button>
        <button className="btn" disabled={!frame||!!busy} onClick={()=>void run('close')}>
          <XCircle size={16}/> Encerrar</button>
        {frame?.url&&<a className="btn btn-ghost" target="_blank" rel="noopener noreferrer"
          href={frame.url}>Abrir no meu navegador <ExternalLink size={14}/></a>}
      </div>
      {frame?<div style={{textAlign:'center'}}>
        <p className="micro" style={{marginBottom:10}}>
          {frame.title||'Página aberta'} · Clique sobre o print para clicar na página.
          Arraste para cima/baixo no celular para rolar.
        </p>
        <div style={{display:'flex',justifyContent:'center',background:'#0b1220',
          border:'1px solid #334155',borderRadius:12,padding:6,overflowX:'auto'}}>
          <img src={'data:image/jpeg;base64,'+frame.image} alt="Tela atual do navegador remoto"
            onClick={click} onWheel={wheel}
            onTouchStart={e=>{swipeStart.current=e.touches[0].clientY;}}
            onTouchEnd={finishSwipe}
            draggable={false}
            style={{width:frame.width,maxWidth:'100%',height:'auto',display:'block',
              borderRadius:6,touchAction:'none',cursor:busy?'wait':'crosshair'}}/>
        </div>
        <div className="flex gap-2 wrap center mt-3">
          <button className="btn" disabled={!!busy} onClick={()=>void run('scroll',{delta:-660})}>
            <ChevronUp size={15}/> Subir</button>
          <button className="btn" disabled={!!busy} onClick={()=>void run('scroll',{delta:660})}>
            <ChevronDown size={15}/> Descer</button>
          <button className="btn" disabled={!!busy} onClick={()=>void run('frame')}>
            <RefreshCcw size={15}/> Atualizar tela</button>
        </div>
        <div className="flex gap-2 wrap mt-3">
          <input className="input" value={keyboard} onChange={e=>setKeyboard(e.target.value)}
            placeholder="Clique no campo da página; digite aqui..." style={{flex:'1 1 220px'}}
            maxLength={350} aria-label="Texto para digitar na página"/>
          <button className="btn" disabled={!!busy||!keyboard.trim()}
            onClick={()=>{void run('type',{text:keyboard});setKeyboard('');}}>
            <Keyboard size={16}/> Digitar</button>
          <button className="btn" disabled={!!busy} onClick={()=>void run('press',{key:'Enter'})}>Enter</button>
        </div>
        <div className="mt-3" style={{padding:16,border:'1px solid #316c62',borderRadius:14}}>
          <strong style={{fontSize:15,display:'block',marginBottom:9}}>
            Gostou da oferta? Traga para o Caçador.
          </strong>
          <p className="muted" style={{fontSize:12,marginBottom:12}}>
            Captura o endereço atual, título, texto público, possíveis preços, links de checkout
            e um print. Não comprova anúncios nem vendas.
          </p>
          <button className="btn btn-primary wide" disabled={!!busy||!frame.url}
            onClick={()=>void run('capture')}>
            {busy==='capture'?<LoaderCircle size={17} className="spin"/>:<Camera size={17}/>}
            {busy==='capture'?'Capturando e salvando...':'Trazer esta oferta para o Caçador'}
          </button>
        </div>
      </div>:<div className="info-note" style={{padding:25,textAlign:'center'}}>
        <Globe2 size={36} style={{display:'block',margin:'0 auto 12px'}}/>
        <strong>Seu navegador de pesquisa aparece aqui.</strong>
        <p style={{marginTop:8,fontSize:13}}>Digite um endereço público HTTPS e clique em Abrir navegador.
        Você navega na mesma tela e só importa quando escolher.</p>
      </div>}
    </section>
    {imported&&<section className="panel mt-3">
      <div className="flex center gap-2"><Check size={18}/><strong>Oferta salva!</strong></div>
      <p className="muted mt-2" style={{fontSize:13}}>
        {imported.extracted?.title||'Página capturada'} ·
        Preço extraído: {imported.extracted?.price===null||imported.extracted?.price===undefined?
          'A confirmar':imported.extracted?.currency+' '+imported.extracted?.price}
        . Confira no site antes de usar o dado.
      </p>
      {imported.warning&&<p className="risk-tip mt-2">{imported.warning}</p>}
      {imported.partialScreenshot&&<p className="micro">O site era extenso; apenas a tela visível coube no print.</p>}
      <div className="flex gap-2 wrap mt-3">
        <Link className="btn btn-primary" href={'/products/'+imported.productId}>
          <Save size={15}/> Abrir dossiê da oferta</Link>
        {imported.screenshotUrl&&<a className="btn" target="_blank" rel="noopener noreferrer"
          href={imported.screenshotUrl}>Ver print salvo <ExternalLink size={14}/></a>}
        <Link className="btn" href={'/products/'+imported.productId+'/remodelar'}>
          Criar página com IA <ArrowRight size={14}/></Link>
      </div>
    </section>}
  </>;
}
