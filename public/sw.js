/* Service worker do Caçador de Ofertas.
   Recebe Web Push e abre o app instalado. Não guarda páginas nem sessões. */
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Ouvinte vazio: o Chrome exige um handler de fetch para instalar o PWA.
     A navegação continua online, com a sessão do Supabase intacta. */
});

function destination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {title: 'Caçador de Ofertas', body: event.data ? event.data.text() : ''};
  }
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : 'Caçador de Ofertas';
  const body = typeof data.body === 'string' ? data.body.slice(0, 240) : '';
  const url = destination(data.url);
  const tag = typeof data.tag === 'string' ? data.tag.slice(0, 80) : 'cacador';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    lang: 'pt-BR',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    data: {url},
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(destination(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(windows => {
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        if (typeof client.navigate === 'function') client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
