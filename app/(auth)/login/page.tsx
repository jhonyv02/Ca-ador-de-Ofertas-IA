'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, LoaderCircle, ArrowRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { Field, Feedback } from '@/components/ui';
import {dbErrorMessage} from '@/lib/db-error';

export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);

  function resetFeedback() {
    setError('');
    setMessage('');
    setUnconfirmed(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    resetFeedback();

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('O acesso ainda não está configurado. Confira as variáveis do Supabase na Hostinger.');
      }
      const client = browserClient();

      if (signup) {
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace('/dashboard');
          router.refresh();
        } else {
          setUnconfirmed(true);
          setMessage('Cadastro recebido! Verifique sua caixa de entrada e a pasta de spam para confirmar seu e-mail antes de entrar.');
        }
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace('/dashboard');
        router.refresh();
      }
    } catch (err) {
      const msg = dbErrorMessage(err,'Falha na autenticação.');
      if (/email not confirmed|email.*not.*confirm|email.*não.*confirm/i.test(msg)) {
        setUnconfirmed(true);
        setError('Seu e-mail ainda não foi confirmado. Abra o link de confirmação recebido por e-mail ou solicite um novo abaixo.');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    resetFeedback();
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Digite um endereço de e-mail válido para reenviar a confirmação.');
      setUnconfirmed(true);
      return;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setError('O acesso ainda não está configurado na Hostinger.');
      setUnconfirmed(true);
      return;
    }
    setBusy(true);
    try {
      const { error: resendError } = await browserClient().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (resendError) throw resendError;
      setUnconfirmed(true);
      setMessage('Se o cadastro estiver aguardando confirmação e o envio estiver permitido, você receberá um novo e-mail. Confira também o spam.');
    } catch (err) {
      setUnconfirmed(true);
      const msg = err instanceof Error ? err.message : 'Não foi possível reenviar.';
      setError(/rate limit|too many|exceeded/i.test(msg)
        ? 'Limite de envio atingido. Aguarde um pouco antes de tentar novamente.'
        : `Não foi possível reenviar a confirmação: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand"><Target size={28}/> <span>CAÇADOR<span style={{ color: '#3ce0a1' }}>.IA</span></span></div>
        <h1>{signup ? 'Sua nova central de pesquisa.' : 'Entre no seu radar de ofertas.'}</h1>
        <p>Salve anúncios, analise concorrentes e priorize produtos com mais evidências antes de investir.</p>
        <form onSubmit={submit} className="auth-form">
          <Field label="Seu e-mail">
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com" autoComplete="email" />
          </Field>
          <Field label="Senha">
            <input className="input" type="password" minLength={6} required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              autoComplete={signup ? 'new-password' : 'current-password'} />
          </Field>
          {error && <Feedback type="error">{error}</Feedback>}
          {error && /conexão|supabase|hostinger|fetch/i.test(error) && <a className="small-link" href="/diagnostico">Testar conexão com o Supabase</a>}
          {message && <Feedback type="success">{message}</Feedback>}
          <button className="btn btn-primary wide" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17}/> : <ArrowRight size={17}/>}
            {signup ? 'Criar minha conta' : 'Entrar no painel'}
          </button>
        </form>
        {unconfirmed && (
          <button type="button" className="auth-switch" disabled={busy} onClick={resendConfirmation}>
            {busy ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
          </button>
        )}
        <button className="auth-switch" disabled={busy} onClick={() => {
          setSignup(!signup);
          resetFeedback();
        }}>
          {signup ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Cadastre-se gratuitamente'}
        </button>
        <div className="micro mt-3">Para uso privado, restrinja novos cadastros nas configurações de autenticação do Supabase.</div>
      </div>
    </main>
  );
}
