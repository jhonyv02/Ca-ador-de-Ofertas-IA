'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, Mail, LockKeyhole, LoaderCircle, ArrowRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { Field, Feedback } from '@/components/ui';
export default function Login(){
 const router=useRouter();const [signup,setSignup]=useState(false);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Error('Configure o Supabase no arquivo .env.local primeiro.');
  const client=browserClient();
  if(signup){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/auth/callback`}});if(error)throw error;if(data.session){router.replace('/dashboard');router.refresh();}else setMessage('Cadastro enviado! Confira seu e-mail para confirmar a conta.');}
  else{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;router.replace('/dashboard');router.refresh();}
 }catch(e){setError(e instanceof Error?e.message:'Falha na autenticação');}finally{setBusy(false);}}
 return <main className="auth-page"><div className="auth-panel"><div className="auth-brand"><Target size={28}/> <span>CAÇADOR<span style={{color:'#3ce0a1'}}>.IA</span></span></div><h1>{signup?'Sua nova central de pesquisa.':'Entre no seu radar de ofertas.'}</h1><p>Salve anúncios, analise concorrentes e priorize produtos com mais evidências antes de investir.</p><form onSubmit={submit} className="auth-form"><Field label="Seu e-mail"><input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email"/></Field><Field label="Senha"><input className="input" type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={signup?'new-password':'current-password'}/></Field>{error&&<Feedback type="error">{error}</Feedback>}{message&&<Feedback type="success">{message}</Feedback>}<button className="btn btn-primary wide" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {signup?'Criar minha conta':'Entrar no painel'}</button></form><button className="auth-switch" onClick={()=>{setSignup(!signup);setMessage('');setError('')}}>{signup?'Já tem uma conta? Faça login':'Ainda não tem conta? Cadastre-se gratuitamente'}</button><div className="micro mt-3">Se o registro estiver aberto, qualquer pessoa poderá se cadastrar. Para uso privado, restrinja novas contas nas configurações de Auth do Supabase.</div></div></main>;
}
