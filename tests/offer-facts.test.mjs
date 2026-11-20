import test from 'node:test';
import assert from 'node:assert/strict';
import {digitalRadar, offerFacts, researchBars} from '../lib/digital-radar.ts';

const base = {
  notes: '',
  landing_url: 'https://exemplo.com',
  sale_price: 10,
  niche: 'Educação',
  promise: 'Guia',
  target_audience: 'Pais',
};

test('formato da coluna aparece no card e a tag antiga continua como reserva', () => {
  assert.equal(offerFacts({format: 'ebook', notes: '#formato-digital:curso'}).formatLabel, 'E-book / guia');
  assert.equal(offerFacts({format: '', notes: 'linha\n#formato-digital:planilha'}).formatLabel, 'Planilhas / calculadoras');
  assert.equal(offerFacts({notes: 'sem tag'}).formatLabel, 'Formato não informado');
});

test('dificuldade da coluna tem prioridade e a análise preenche quando ela está vazia', () => {
  const column = offerFacts({format: 'app', difficulty: 'facil'}, {breakdown: {ease: 4}});
  assert.equal(column.effort, 'Menor esforço estimado · 4/30');
  const fromEase = offerFacts({format: '', difficulty: ''}, {breakdown: {ease: 24}});
  assert.equal(fromEase.formatLabel, 'Formato não informado');
  assert.equal(fromEase.effort, 'Menor esforço estimado · 24/30');
  const fromExecution = offerFacts({}, {breakdown: {execution: 12}});
  assert.equal(fromExecution.effort, 'Menor esforço estimado · 12/15');
  const highExecution = offerFacts({}, {breakdown: {execution: 18}});
  assert.equal(highExecution.effort, 'Esforço moderado · 18/30');
  assert.equal(offerFacts({format: 'printable'}).effort, 'Menor esforço estimado');
  assert.equal(offerFacts({}).effort, 'Não avaliado');
});

test('pesquisa com pontos, máximo e motivo não zera a facilidade', () => {
  const breakdown = {
    facilidade: {pontos: 18, max: 20, motivo: 'PDF curto'},
    adequacao_br: {pontos: 10, max: 20, motivo: 'Preço em dólar'},
    demanda_exterior: {pontos: 4, max: 20, motivo: 'Pouca prova'},
    diferenciacao: {pontos: 12, max: 20, motivo: 'Ângulo próprio'},
    trafego_direto: {pontos: 8, max: 20, motivo: 'Checkout externo'},
  };
  const bars = researchBars(breakdown);
  assert.ok(bars);
  assert.equal(bars[0].pontos, 18);
  assert.equal(bars[0].max, 20);
  assert.match(bars[0].motivo, /PDF/);
  assert.equal(offerFacts({difficulty: ''}, {breakdown}).effort, 'Menor esforço estimado · 18/20');
});

test('o radar usa o formato da coluna na nota e a facilidade da análise', () => {
  const radar = digitalRadar({...base, format: 'curso', difficulty: ''}, [], {breakdown: {facilidade: 6}});
  assert.match(radar.effort, /Maior esforço estimado · 6\/30/);
  assert.equal(radar.next, 'Pesquisar anúncios individuais na Meta');
});
