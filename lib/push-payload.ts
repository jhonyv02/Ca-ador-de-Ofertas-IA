import {createHash, timingSafeEqual} from 'node:crypto';

export const PUSH_SECRET_PLACEHOLDER = 'TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO';
export type PushEvent = 'new_offer' | 'weekly_pick' | 'ready_for_approval';
export type PushMessage = {
  event: PushEvent;
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function bearerToken(header: string | null): string {
  if (!header) return '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || '';
}

export function configuredWebhookSecret(value: string | undefined): string | null {
  const secret = (value || '').trim();
  if (secret.length < 24 || secret === PUSH_SECRET_PLACEHOLDER) return null;
  return secret;
}

export function webhookAuthorized(header: string | null, expected: string | undefined): boolean {
  const provided = bearerToken(header);
  const secret = (expected || '').trim();
  if (provided.length < 24 || secret.length < 24) return false;
  if (provided === PUSH_SECRET_PLACEHOLDER || secret === PUSH_SECRET_PLACEHOLDER) return false;
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(secret).digest();
  return timingSafeEqual(left, right);
}

export function pushMessages(product: {id: string; name: string; weekly_pick?: boolean}, events: PushEvent[]): PushMessage[] {
  const name = product.name.trim().slice(0, 150) || 'Oferta';
  const url = '/products/' + product.id;
  const messages: PushMessage[] = [];
  if (events.includes('new_offer')) {
    messages.push({
      event: 'new_offer',
      title: 'Nova oferta',
      body: name + ' entrou no seu radar.',
      url,
      tag: 'new_offer-' + product.id,
    });
  }
  if (events.includes('weekly_pick') && product.weekly_pick) {
    messages.push({
      event: 'weekly_pick',
      title: 'Escolha da semana',
      body: 'Prioridade para lançar: ' + name,
      url,
      tag: 'weekly_pick-' + product.id,
    });
  }
  if (events.includes('ready_for_approval')) {
    messages.push({
      event: 'ready_for_approval',
      title: 'Pronto para aprovação',
      body: 'Produto preparado para aprovação: ' + name,
      url,
      tag: 'ready_for_approval-' + product.id,
    });
  }
  return messages;
}

export function notificationPayload(message: PushMessage) {
  return JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url,
    tag: message.tag,
  });
}
