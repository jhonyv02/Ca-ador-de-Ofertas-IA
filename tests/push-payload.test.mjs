import test from 'node:test';
import assert from 'node:assert/strict';
import {pushMessages, webhookAuthorized} from '../lib/push-payload.ts';

const product = {id: '11111111-1111-4111-8111-111111111111', name: 'Planner infantil', weekly_pick: true};

test('oferta nova e escolha da semana geram avisos diferentes', () => {
  const messages = pushMessages(product, ['new_offer', 'weekly_pick']);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].title, 'Nova oferta');
  assert.match(messages[0].body, /Planner infantil/);
  assert.equal(messages[0].url, '/products/' + product.id);
  assert.equal(messages[1].title, 'Escolha da semana');
  assert.match(messages[1].body, /Prioridade para lançar/);
});

test('escolha da semana só avisa se a oferta continua marcada', () => {
  assert.deepEqual(pushMessages({...product, weekly_pick: false}, ['weekly_pick']), []);
});

test('o segredo de exemplo e segredos curtos não autorizam o webhook', () => {
  const good = 'segredo-longo-de-teste-123456';
  assert.equal(webhookAuthorized('Bearer ' + good, good), true);
  assert.equal(webhookAuthorized('Bearer ' + good, good + 'x'), false);
  assert.equal(webhookAuthorized('Bearer curto', 'curto'), false);
  assert.equal(webhookAuthorized('Bearer TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO', 'TROQUE_ESTE_SEGREDO_POR_UM_VALOR_LONGO'), false);
  assert.equal(webhookAuthorized(null, good), false);
});
