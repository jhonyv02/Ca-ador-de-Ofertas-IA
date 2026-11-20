'use client';
import {useEffect, useState} from 'react';
import {Bell, BellOff, Smartphone} from 'lucide-react';
import {Section, Feedback} from '@/components/ui';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
};
type Env = {ios: boolean; standalone: boolean; webview: boolean; supported: boolean};

function isIos() {
  const ua = navigator.userAgent;
  const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || ipad;
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & {standalone?: boolean}).standalone));
}
function isAndroidWebView() {
  return /\bwv\b/.test(navigator.userAgent) || /; wv\)/.test(navigator.userAgent);
}
function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushOptIn({compact = false}: {compact?: boolean}) {
  const [env, setEnv] = useState<Env | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [subscribed, setSubscribed] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const next = {
      ios: isIos(),
      standalone: isStandalone(),
      webview: isAndroidWebView(),
      supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    };
    setEnv(next);
    if (compact && window.localStorage.getItem('cacador:push-banner') === 'hide') setHidden(true);
    if (!next.supported) return;
    setPermission(Notification.permission);
    let alive = true;
    void navigator.serviceWorker.getRegistration('/').then(async registration => {
      const current = await registration?.pushManager.getSubscription();
      if (alive) setSubscribed(!!current);
    }).catch(() => {});
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => {
      alive = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, [compact]);

  async function enable() {
    if (!env?.supported || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        throw new Error('A permissão de notificação não foi concedida neste aparelho.');
      }
      const keyResponse = await fetch('/api/push/public-key');
      const keyBody = await keyResponse.json() as {publicKey?: string; error?: string};
      if (!keyResponse.ok || !keyBody.publicKey) {
        throw new Error(keyBody.error || 'O servidor ainda não tem a chave pública de notificação.');
      }
      const registration = await navigator.serviceWorker.register('/sw.js', {scope: '/'});
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyBody.publicKey),
      });
      const json = subscription.toJSON();
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({endpoint: json.endpoint, keys: json.keys}),
      });
      const saved = await response.json() as {error?: string};
      if (!response.ok) throw new Error(saved.error || 'Não foi possível salvar este aparelho.');
      setSubscribed(true);
      setMessage('Este aparelho vai receber aviso de oferta nova e da escolha da semana.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ativar as notificações.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({endpoint: subscription.endpoint}),
        });
        if (!response.ok) {
          const saved = await response.json() as {error?: string};
          throw new Error(saved.error || 'Não foi possível desligar.');
        }
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Notificações desligadas neste aparelho.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível desligar as notificações.');
    } finally {
      setBusy(false);
    }
  }

  async function installApp() {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  }

  if (!env || (compact && hidden && !error)) return null;
  const iosNeedsInstall = env.ios && !env.standalone;
  const blocked = env.webview || iosNeedsInstall || !env.supported || permission === 'denied';
  const note = env.webview
    ? 'Este ícone é o APK do Caçador. Ele abre o site por dentro e o Android não entrega aviso aqui. Os avisos chegam no ícone instalado pelo Chrome.'
    : iosNeedsInstall
      ? 'No iPhone ou iPad, a notificação só funciona com o site instalado na Tela de Início, no iOS 16.4 ou mais novo. No Safari: Compartilhar, Adicionar à Tela de Início. Depois abra o Caçador por esse ícone e toque em ativar.'
      : !env.supported
        ? 'Este navegador não oferece notificação Web Push.'
        : permission === 'denied'
          ? 'As notificações estão bloqueadas para este site. Libere o Caçador nas configurações do celular e volte aqui.'
          : subscribed
            ? 'Este aparelho está inscrito. Uma oferta nova da sua conta, ou a escolha da semana, gera um aviso mesmo quando o cadastro é feito direto no banco.'
            : 'Ative neste aparelho para receber um aviso quando entrar uma oferta nova na sua conta e quando uma oferta for marcada como escolha da semana.';

  const body = <>
    <p className="muted" style={{fontSize: 12, marginTop: 0}}>{note}</p>
    {env.webview && <ol className="muted" style={{fontSize: 12, lineHeight: 1.55, margin: '8px 0 0', paddingLeft: 18}}>
      <li>Abra o Chrome, não este ícone.</li>
      <li>Entre em grey-spider-486365.hostingersite.com e faça login.</li>
      <li>Toque nos três pontinhos e em Instalar app.</li>
      <li>Abra o ícone novo, vá em Configurações e toque em Ativar notificações neste aparelho.</li>
    </ol>}
    {install && !env.standalone && <button type="button" className="btn" onClick={() => void installApp()}><Smartphone size={15}/> Instalar na tela inicial</button>}
    <div className="flex wrap gap-2 mt-2">
      {!blocked && !subscribed && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void enable()}>
        <Bell size={15}/> {busy ? 'Ativando...' : 'Ativar notificações neste aparelho'}
      </button>}
      {subscribed && <button type="button" className="btn" disabled={busy} onClick={() => void disable()}>
        <BellOff size={15}/> {busy ? 'Desligando...' : 'Desligar neste aparelho'}
      </button>}
      {compact && <button type="button" className="btn btn-ghost" onClick={() => {
        window.localStorage.setItem('cacador:push-banner', 'hide');
        setHidden(true);
      }}>Agora não</button>}
    </div>
    {error && <div className="mt-2"><Feedback type="error">{error}</Feedback></div>}
    {message && <div className="mt-2"><Feedback type="success">{message}</Feedback></div>}
  </>;

  if (compact) {
    return <section className="panel" style={{marginBottom: 16}}>
      <h2>Avisos no celular</h2>
      <div className="mt-2">{body}</div>
    </section>;
  }
  return <Section title="Notificações neste aparelho" description="Web Push para o site instalado na tela inicial. Vale para ofertas criadas aqui ou gravadas direto no Supabase.">
    {body}
  </Section>;
}
