'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, LockKeyhole } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { Field, Feedback } from '@/components/ui';
export default function UpdatePassword(){const router=useRouter();const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
async function handle(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');const {error}=await browserClient().auth.updateUser({password});if(error){setError(error.message);setBusy(false);return;}router.replace('/dashboard');router.refresh();}
return <main className="auth-page"><div className="auth-panel"><div className="auth-brand"><Target/> <span>CAÇADOR.IA</span></div><h1>Definir nova senha</h1><p>Digite a nova senha para sua conta.</p><form onSubmit={handle} className="auth-form"><Field label="Nova senha"><input className="input" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></Field>{error&&<Feedback type="error">{error}</Feedback>}<button disabled={busy} className="btn btn-primary">Salvar nova senha</button></form></div></main>}
