'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Activity,CheckCircle2,AlertCircle,LoaderCircle,RefreshCcw,Copy,ArrowLeft} from 'lucide-react';

const EXPECTED_HOST = 'brhnrukuwqbfhbyruzak.supabase.co';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

type Check = {reached:boolean|null;status:number|null;error:string|null};
type Server = {
  checkedAt:string; expectedHost:string; configuredHost:string;
  correctProject:boolean;publicKeyPresent:boolean;
  serverReachable:boolean|null;httpStatus:number|null;problem:string|null;
};

function getConfiguredHost() {
  try {return new URL(SUPABASE_URL).hostname.toLowerCase();}
  catch {return '(não configurado)';}
}
const CLIENT_HOST = getConfiguredHost();
const CLIENT_PROJECT_OK = CLIENT_HOST === EXPECTED_HOST && SUPABASE_URL.startsWith('https://');
const CLIENT_KEY_OK = PUBLISHABLE_KEY.length>0 &&
  !PUBLISHABLE_KEY.includes('COLE_AQUI') &&
  !PUBLISHABLE_KEY.startsWith('sb_publishable_test_');

async function browserCheck():Promise<Check> {
  if (!CLIENT_PROJECT_OK || !CLIENT_KEY_OK) {
    return {reached:null,status:null,error:'Configure primeiro a URL correta e a chave pública na Hostinger.'};
  }
  try {
    const response = await fetch(`https://${EXPECTED_HOST}/auth/v1/health`, {
      method:'GET',cache:'no-store',redirect:'manual',mode:'cors',
      signal:AbortSignal.timeout(6500),
      headers:{Accept:'application/json'}
    });
    return {reached:true,status:response.status,
      error:response.status>=500?'O Supabase respondeu com erro HTTP '+response.status+'.':null};
  } catch {
    return {reached:false,status:null,error:'O navegador não conseguiu acessar o Supabase. Pode ser DNS, extensão de privacidade, CORS, bloqueio de rede ou indisponibilidade.'};
  }
}

function Result({ok,text}:{ok:boolean|null;text:string}) {
  const Icon=ok===true?CheckCircle2:ok===false?AlertCircle:Activity;
  return <div className="flex gap-2 center" style={{alignItems:'flex-start',padding:'9px 0',fontSize:13}}>
    <Icon size={19} style={{flexShrink:0,color:ok===true?'#51ddb0':ok===false?'#f1ae78':'#a4acc0'}}/>
    <span>{text}</span>
  </div>;
}

export default function Diagnostico() {
 const [busy,setBusy]=useState(true);
 const [server,setServer]=useState<Server|null>(null);
 const [browser,setBrowser]=useState<Check>({reached:null,status:null,error:null});
 const [copied,setCopied]=useState(false);

 const run=useCallback(async()=>{
   setBusy(true);setCopied(false);
   const [sv,bv]=await Promise.allSettled([
     fetch('/api/diagnostico',{method:'GET',cache:'no-store'}).then(async r=>{
       if(!r.ok)throw new Error('O servidor retornou HTTP '+r.status);
       return await r.json() as Server;
     }),
     browserCheck(),
   ]);
   setServer(sv.status==='fulfilled'?sv.value:null);
   setBrowser(bv.status==='fulfilled'?bv.value:{reached:false,status:null,error:'Falha inesperada no teste pelo navegador.'});
   setBusy(false);
 },[]);

 useEffect(()=>{void run();},[run]);

 const report=[
  'Caçador de Ofertas IA — diagnóstico de conexão',
  'Projeto esperado: '+EXPECTED_HOST,
  'Projeto no build do navegador: '+CLIENT_HOST,
  'Chave pública no build: '+(CLIENT_KEY_OK?'configurada':'ausente/inválida'),
  'Projeto no servidor: '+(server?.configuredHost||'não verificado'),
  'Chave pública no servidor: '+(server?.publicKeyPresent?'configurada':'ausente/não verificada'),
  'Hostinger > Supabase: '+(server?.serverReachable===true?'conectou (HTTP '+server?.httpStatus+')':server?.serverReachable===false?'falhou':'não testado'),
  'Navegador > Supabase: '+(browser.reached===true?'conectou (HTTP '+browser.status+')':browser.reached===false?'falhou':'não testado'),
 ].join('\n');

 const projectOk=CLIENT_PROJECT_OK&&CLIENT_KEY_OK&&server?.correctProject===true&&server?.publicKeyPresent===true;
 const serverOk=server?.serverReachable===true && server.httpStatus!==null && server.httpStatus<500;
 const browserOk=browser.reached===true && browser.status!==null && browser.status<500;

 return <main className="auth-page" style={{padding:'28px 16px'}}>
   <section className="auth-panel" style={{width:'min(100%,680px)',maxWidth:680}}>
    <Link href="/dashboard" className="small-link"><ArrowLeft size={14}/> Voltar ao painel</Link>
    <div className="auth-brand" style={{marginTop:16}}><Activity size={25}/><span>DIAGNÓSTICO <span style={{color:'#3ce0a1'}}>DA CONEXÃO</span></span></div>
    <h1 style={{fontSize:25,marginTop:12}}>Vamos descobrir por que não está salvando.</h1>
    <p>Este teste verifica apenas a conexão com o Supabase. Nenhuma senha, token ou chave privada será exibida.</p>

    <div style={{border:'1px solid #334158',borderRadius:12,padding:'15px 18px',marginTop:18}}>
      <strong>1. Configuração do Supabase</strong>
      <Result ok={CLIENT_PROJECT_OK}
       text={CLIENT_PROJECT_OK?'O navegador está apontando para o projeto Caçador de Ofertas.':
         'Projeto incorreto no site publicado: '+CLIENT_HOST+'. Esperado: '+EXPECTED_HOST+'.'}/>
      <Result ok={CLIENT_KEY_OK} text={CLIENT_KEY_OK?'A chave pública está incluída no site.':'A chave pública do Supabase está ausente ou inválida no build.'}/>
      {!busy&&server&&<Result ok={server.correctProject&&server.publicKeyPresent}
        text={(server.correctProject&&server.publicKeyPresent)?
          'O servidor da Hostinger também possui a URL e a chave pública configuradas.':
          'A configuração no servidor não está correta: '+(server.problem||'verifique as variáveis de ambiente')}/>}
    </div>

    <div style={{border:'1px solid #334158',borderRadius:12,padding:'15px 18px',marginTop:12}}>
      <strong>2. Comunicação entre os serviços</strong>
      {busy?<div className="flex gap-2 center mt-2"><LoaderCircle className="spin" size={18}/> Testando as conexões...</div>:<>
        <Result ok={serverOk}
          text={server===null?'Não foi possível executar o teste da Hostinger.':
            server?.serverReachable===true?
              'Hostinger chegou ao Supabase (HTTP '+server.httpStatus+').':
              server?.problem||'A Hostinger não conseguiu chegar ao Supabase.'}/>
        <Result ok={browserOk}
          text={browser.reached===true?
            'Seu navegador chegou ao Supabase (HTTP '+browser.status+').':
            browser.error||'Não foi possível testar o navegador.'}/>
      </>}
    </div>

    {!busy&&<div className="info-note" style={{marginTop:14}}>
      {!projectOk?
        'Correção indicada: ajuste NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Hostinger e faça um NOVO BUILD (Reimplantar).':
        !serverOk?
        'A Hostinger não conseguiu concluir o teste. Confira se o projeto Supabase está ativo e se a hospedagem consegue acessar o endereço do Supabase.':
        !browserOk?
        'A Hostinger acessa o Supabase, mas seu navegador não. Experimente uma janela anônima sem extensões e verifique o erro na aba Rede (F12).':
        'As duas conexões responderam. Se o salvamento continuar falhando, confira na aba Rede (F12) a requisição /rest/v1/products: o código HTTP pode indicar chave, sessão ou permissão RLS.'}
    </div>}
    <div className="flex gap-2 wrap" style={{marginTop:18}}>
      <button type="button" className="btn btn-primary" onClick={()=>void run()} disabled={busy}>
        {busy?<LoaderCircle size={16} className="spin"/>:<RefreshCcw size={16}/>}
        Testar novamente
      </button>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={async()=>{
        try {await navigator.clipboard.writeText(report);setCopied(true);}
        catch {setCopied(false);}
      }}><Copy size={16}/>{copied?'Copiado!':'Copiar resultado para o suporte'}</button>
    </div>
    <p className="micro mt-3">Se alterar variáveis de ambiente, reimplante o site antes de testar novamente. Chaves privadas não devem ser compartilhadas.</p>
   </section>
 </main>;
}
