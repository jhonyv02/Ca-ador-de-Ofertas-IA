/** Trata erros lançados pelo Supabase (objetos PostgREST nem sempre são instâncias de Error).
 *  Não inclui dados do formulário, credenciais, tokens ou cookies nas mensagens.
 */
export function dbErrorMessage(value: unknown, fallback = 'Não foi possível salvar'): string {
  if (typeof value === 'string') return value.slice(0, 650) || fallback;
  if (!value || typeof value !== 'object') return fallback;

  const obj = value as Record<string, unknown>;
  const code = typeof obj.code === 'string' ? obj.code.slice(0, 24) : '';
  const message = typeof obj.message === 'string' ? obj.message.slice(0, 450) : '';
  const details = typeof obj.details === 'string' ? obj.details.slice(0, 160) : '';
  const hint = typeof obj.hint === 'string' ? obj.hint.slice(0, 160) : '';
  const raw = message.toLowerCase();
  if (/failed to fetch|fetch failed|networkerror|network request failed/.test(raw)) {
    return 'Falha de conexão com o Supabase. Não é necessário recriar as tabelas. Abra /diagnostico no seu site para verificar a URL configurada e testar se a Hostinger e o navegador conseguem alcançar o banco.';
  }

  if (code === 'PGRST205' || code === '42P01' || /could not find the table.*schema cache/i.test(message)) {
    return 'A tabela do banco não foi encontrada na conexão atual. Confira se a URL do Supabase configurada na Hostinger é a do projeto Caçador de Ofertas e reimplante o site. ' + (code ? '(' + code + ')' : '');
  }
  if (code === 'PGRST204' || code === '42703' || /column.*schema cache/i.test(message)) {
    return 'O banco conectado está com uma estrutura antiga. Confira se o SQL atualizado foi executado nesse mesmo projeto. ' + (code ? '(' + code + ')' : '');
  }
  if (code === '42501' || /row.level security|permission denied/i.test(message)) {
    return 'O Supabase bloqueou a operação por permissão/RLS. Confirme se você está conectado à conta correta e se as políticas de acesso foram criadas no projeto do Caçador. ' + (code ? '(' + code + ')' : '');
  }
  if (code === '23503') return 'O registro está ligado a outro registro inexistente ou não acessível. Atualize a página, selecione novamente o produto e tente salvar. (23503)';
  if (code === '23505') return 'Este registro já existe no banco. Atualize a página para conferir antes de tentar novamente. (23505)';
  if (code === '23502') return 'Falta preencher um campo obrigatório do banco: ' + (message || 'campo não identificado') + ' (23502)';
  if (code === '23514') return 'Um dos valores não é aceito pela regra do banco: ' + (message || 'campo não identificado') + ' (23514)';
  if (code === '22P02') return 'Há um valor no formato inválido para o banco: ' + (message || 'verifique as informações') + ' (22P02)';
  if (code === 'PGRST116') return 'O sistema não encontrou o registro solicitado para confirmar a gravação. (PGRST116)';
  if (/jwt expired|invalid jwt|not authenticated/i.test(message)) return 'Sua sessão expirou. Saia da conta, entre novamente e tente salvar.';

  if (message) {
    const extras = [details, hint].filter(Boolean).filter(x => x !== message);
    return (message + (extras.length ? ' — ' + extras.join(' — ') : '') + (code ? ' (' + code + ')' : '')).slice(0, 700);
  }
  if (value instanceof Error && value.message) return value.message.slice(0, 650);
  return fallback + (code ? ' (' + code + ')' : '');
}
