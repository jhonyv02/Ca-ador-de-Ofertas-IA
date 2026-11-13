import test from 'node:test';
import assert from 'node:assert/strict';
import {dbErrorMessage} from '../lib/db-error.ts';

test('mantém mensagem de erros JS',()=>{
  assert.equal(dbErrorMessage(new Error('Falha na autenticação')), 'Falha na autenticação');
});
test('mensagem PostgREST não deve ser ocultada',()=>{
  assert.match(dbErrorMessage({code:'PGRST301',message:'Erro do Supabase',details:'Teste de diagnóstico'}),/Erro do Supabase/);
  assert.match(dbErrorMessage({code:'PGRST301',message:'Erro do Supabase'}),/PGRST301/);
});
test('identifica política RLS com código 42501',()=>{
  assert.match(dbErrorMessage({code:'42501',message:'new row violates row-level security policy'}),/RLS/);
});
test('identifica tabela ausente e orienta verificar projeto',()=>{
  assert.match(dbErrorMessage({code:'PGRST205',message:"Could not find the table 'public.products' in schema cache"}),/Hostinger/);
});
test('identifica restrição de valores inválidos',()=>{
  assert.match(dbErrorMessage({code:'23514',message:'violates check constraint'}),/regra do banco/);
});
test('não transforma valores inesperados em mensagem vazia',()=>{
  assert.equal(dbErrorMessage({}), 'Não foi possível salvar');
  assert.equal(dbErrorMessage(null), 'Não foi possível salvar');
});
