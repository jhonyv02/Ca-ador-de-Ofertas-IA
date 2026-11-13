'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {browserClient} from '@/lib/supabase/browser';
import {Activity,CheckCircle2,AlertCircle,LoaderCircle,RefreshCcw,Copy,ArrowLeft} from 'lucide-react';

const EXPECTED_HOST = 'brhnrukuwqbfhbyruzak.supabase.co';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

type Check = {reached:boolean|null;status:number|null;error:string|null};
type DatabaseCheck = {
  authenticated:boolean|null; authError:string|null;
  readOk:boolean|null; readStatus:number|null; readCode:string|null; readError:string|null;
};
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
      headers:{Accept:'application/json',apikey:PUBLISHABLE_KEY}
    });
    return {reached:true,status:response.status,
      error:response.status===401||response.status===403?
        'O Supabase recebeu e recusou a chave pública (HTTP '+response.status+'). Confira a chave Publishable do projeto.':
        response.status>=400?'O Supabase respondeu com erro HTTP '+response.status+'.':null};
  } catch {
    return {reached:false,status:null,error:'O navegador não conseguiu acessar o Supabase. Pode ser DNS, extensão de privacidade, CORS, bloqueio de rede ou indisponibilidade.'};
  }
}

async function databaseCheck():Promise<DatabaseCheck>{
  const empty:DatabaseCheck={authenticated:null,authError:null,readOk:null,readStatus:null,readCode:null,readError:null};
  if(!CLIENT_PROJECT_OK||!CLIENT_KEY_OK) return {...empty,authError:'Configure a conexão com o Supabase primeiro.'};
  try {
    const client=browserClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user){
      return {...empty,authenticated:false,authError:authError?.message?.slice(0,180)||'Não há uma sessão de usuário válida. Faça login novamente no Caçador de Ofertas.'};
    }
    const {error,status}=await client.from('products').select('id',{head:true}).limit(1);
    return {...empty,authenticated:true,readOk:!error,readStatus:status,
      readCode:error?.code||null,readError:error?.message?.slice(0,180)||null};
  }catch(e){
    return {...empty,authError:e instanceof Error?e.message.slice(0,180):'Falha de rede ao testar a sessão.'};
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
 const [db,setDb]=useState<DatabaseCheck>({authenticated:null,authError:null,readOk:null,readStatus:null,readCode:null,readError:null});
 const [copied,setCopied]=useState(false);

 const run=useCallback(async()=>{
   setBusy(true);setCopied(false);
   const [sv,bv,dv]=await Promise.allSettled([
     fetch('/api/diagnostico',{method:'GET',cache:'no-store'}).then(async r=>{
       if(!r.ok)throw new Error('O servidor retornou HTTP '+r.status);
       return await r.json() as Server;
     }),
     browserCheck(),
     databaseCheck(),
   ]);
   setServer(sv.status==='fulfilled'?sv.value:null);
   setBrowser(bv.status==='fulfilled'?bv.value:{reached:false,status:null,error:'Falha inesperada no teste pelo navegador.'});
   setDb(dv.status==='fulfilled'?dv.value:{authenticated:null,authError:'Teste de sessão não pôde ser concluído.',readOk:null,readStatus:null,readCode:null,readError:null});
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
  'Navegador > Supabase (chave pública): '+(browser.reached===true?'HTTP '+browser.status:browser.reached===false?'falhou':'não testado'),
  'Sessão autenticada: '+(db.authenticated===true?'válida':db.authenticated===false?'inválida':'não verificada'),
  'Leitura da tabela products: '+(db.readOk===true?'permitida (HTTP '+db.readStatus+')':db.readOk===false?'falhou (HTTP '+db.readStatus+', código '+(db.readCode||'não informado')+')':'não testada'),
  'Erro de sessão: '+(db.authError||'nenhum'),
  'Erro de leitura: '+(db.readError||'nenhum'),
 ].join('\n');

 const projectOk=CLIENT_PROJECT_OK&&CLIENT_KEY_OK&&server?.correctProject===true&&server?.publicKeyPresent===true;
 const serverOk=server?.serverReachable===true && server.httpStatus!==null && server.httpStatus>=200 && server.httpStatus<300;
 const browserOk=browser.reached===true && browser.status!==null && browser.status>=200 && browser.status<300;

 return <main className="auth-page" style={{padding:'28px 16px'}}>
   <section className="auth-panel" style={{width:'min(100%,680px)',maxWidth:680}}>
    <Link href="/dashboard" className="small-link"><ArrowLeft size={14}/> Voltar ao painel</Link>
    <div className="auth-brand" style={{marginTop:16}}><Activity size={25}/><span>DIAGNÓSTICO <span style={{color:'#3ce0a1'}}>DA CONEXÃO</span></span></div>
    <h1 style={{fontSize:25,marginTop:12}}>Vamos descobrir por que não está salvando.</h1>
    <p>Este teste verifica a conexão, a chave pública, sua sessão e a permissão de leitura. Nenhuma senha, token ou chave privada será exibida.</p>

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

    <div style={{border:'1px solid #334158',borderRadius:12,padding:'15px 18px',marginTop:12}}>
      <strong>3. Acesso real ao banco</strong>
      {busy?<p style={{marginTop:10}}>Conferindo sessão e tabela products...</p>:<>
        <Result ok={db.authenticated} text={db.authenticated===true?
          'Sua sessão de usuário está válida.':
          'Sessão: '+(db.authError||'Entre na sua conta para conferir a autenticação.')}/>
        <Result ok={db.readOk} text={db.readOk===true?
          'Leitura da tabela products autorizada pelo Supabase (HTTP '+db.readStatus+').':
          db.readOk===false?
            'Consulta à tabela products falhou (HTTP '+db.readStatus+', código '+(db.readCode||'não informado')+'): '+(db.readError||'Sem detalhes.'):
            'A consulta à tabela products ainda não foi feita.'}/>
      </>}
    </div>

    {!busy&&<div className="info-note" style={{marginTop:14}}>
      {!projectOk?
        'Correção indicada: ajuste NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Hostinger e faça um NOVO BUILD (Reimplantar).':
        !serverOk?
        'A Hostinger não conseguiu concluir o teste. Confira se o projeto Supabase está ativo e se a hospedagem consegue acessar o endereço do Supabase.':
        !browserOk?
        'A Hostinger acessa o Supabase, mas seu navegador não. Experimente uma janela anônima sem extensões e verifique o erro na aba Rede (F12).':
        db.authenticated!==true?
        'A sessão não foi validada. Entre novamente no Caçador de Ofertas e repita o diagnóstico.':
        db.readOk!==true?
        'A tabela products não pôde ser consultada. O código exibido acima ajuda a diferenciar falta de permissão, sessão e estrutura de banco.':
        'Conexão, chave, sessão e leitura funcionaram. Se salvar ainda falhar, envie a mensagem exata do formulário: a operação de gravação pode exigir outra permissão.'}
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
