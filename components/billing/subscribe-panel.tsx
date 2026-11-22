'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import styles from '@/app/marketing.module.css';

type State={active?:boolean;status?:string;currentPeriodEnd?:string|null;error?:string};
export function SubscribePanel({ready}:{ready:boolean}) {
  const [busy,setBusy]=useState(false);
  const [checking,setChecking]=useState(false);
  const [cancelling,setCancelling]=useState(false);
  const [logged,setLogged]=useState<boolean|null>(null);
  const [info,setInfo]=useState<State>({});
  const [error,setError]=useState('');
  async function check(){
    setChecking(true);setError('');
    try{
      const response=await fetch('/api/billing/status',{cache:'no-store'});
      if(response.status===401){setLogged(false);return;}
      setLogged(true);
      const json:State=await response.json();
      if(!response.ok)throw new Error(json.error||'Não foi possível consultar a assinatura');
      setInfo(json);
    }catch(e){setError(e instanceof Error?e.message:'Falha ao consultar assinatura');}
    finally{setChecking(false);}
  }
  useEffect(()=>{void check();},[]);
  async function checkout(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const json=await response.json();
      if(!response.ok)throw new Error(json.error||'Falha ao preparar o checkout');
      if(typeof json.url!=='string')throw new Error('Checkout indisponível');
      window.location.assign(json.url);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o pagamento');setBusy(false);}
  }
  async function cancel(){
    if(!window.confirm('Deseja cancelar a renovação da assinatura?'))return;
    setCancelling(true);setError('');
    try{
      const response=await fetch('/api/billing/cancel',{method:'POST'});
      const json=await response.json();
      if(!response.ok)throw new Error(json.error||'Não foi possível cancelar');
      await check();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao cancelar');}
    finally{setCancelling(false);}
  }
  const paid=info.status==='active'||(info.status==='canceled'&&!!info.currentPeriodEnd&&Date.parse(info.currentPeriodEnd)>Date.now());
  return <div style={{display:'grid',gap:12}}>
    {!ready ? <div role="status" className={styles.secondary} style={{justifyContent:'center'}}>Assinaturas em preparação</div>
    : logged===false ? <Link href="/login" className={styles.primary}>Entre para assinar <ArrowRight size={16}/></Link>
    : logged===null ? <div className={styles.secondary} style={{justifyContent:'center'}}><LoaderCircle size={15}/> Verificando conta</div>
    : paid ? <>
      <div role="status" style={{color:'#8bf5c6',fontSize:12}}>Assinatura {info.status==='canceled'?'cancelada, com acesso até o vencimento':'ativa'}{info.currentPeriodEnd?'. Acesso até '+new Date(info.currentPeriodEnd).toLocaleDateString('pt-BR'):''}.</div>
      <Link href="/dashboard" className={styles.primary}>Abrir meu painel <ArrowRight size={16}/></Link>
      {info.status==='active'&&<button disabled={cancelling} onClick={cancel} className={styles.secondary} style={{justifyContent:'center',cursor:'pointer'}}>{cancelling?'Cancelando...':'Cancelar renovação'}</button>}
    </>
    : <><button onClick={checkout} disabled={busy||checking} className={styles.primary} style={{cursor:'pointer',width:'100%'}}>
      {busy?'Preparando checkout...':'Assinar com Mercado Pago'} {!busy&&<ArrowRight size={16}/>}
    </button><button disabled={checking} onClick={check} className={styles.secondary} style={{cursor:'pointer',justifyContent:'center'}}>{checking?'Consultando pagamento...':'Já paguei — verificar pagamento'}</button></>}
    {error&&<p role="alert" style={{color:'#ff9fa8',fontSize:12,margin:0}}>{error}</p>}
    <small>{ready?'Você será direcionado ao Mercado Pago. A conta só é ativada após pagamento aprovado.':'Nenhuma cobrança pode ser iniciada enquanto a integração estiver em preparação.'}</small>
  </div>;
}
