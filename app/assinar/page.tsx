import Link from 'next/link';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import styles from '../marketing.module.css';

export const metadata = { title: 'Plano mensal | Caçador de Ofertas IA' };
export const dynamic = 'force-dynamic';

export default function Assinar() {
  const preco = process.env.NEXT_PUBLIC_CACADOR_LAUNCH_PRICE || '49,90';
  // Checkout deve ser criado pelo backend para a conta autenticada.
  // Esta rota permanece em pré-lançamento até haver integração idempotente
  // com o provedor, validação de webhook e liberação automática de acesso.

  return <main className={styles.page}>
    <header className={styles.header}><nav className={styles.nav}><Link href="/" className={styles.brand}>CAÇADOR<span className={styles.green}>.IA</span></Link><Link href="/login">Já tenho conta</Link></nav></header>
    <section className={styles.pricing} style={{minHeight:'78vh'}}>
      <div className={styles.pricingIntro}>
        <span className={styles.eyebrow}>Caçador de Ofertas IA</span>
        <h1>Faça pesquisas com mais método.</h1>
        <p>Cadastre oportunidades, analise riscos e organize os próximos testes com IA. Estamos preparando a abertura das assinaturas.</p>
        <p style={{fontSize:12,color:'#9cacbe',display:'flex',alignItems:'center',gap:9}}><ShieldCheck size={18}/> Nunca pague sem confirmar que a cobrança e seu acesso estão disponíveis.</p>
        <Link className={styles.secondary} href="/">Voltar à apresentação</Link>
      </div>
      <div className={styles.priceCard}>
        <strong>Plano mensal de lançamento</strong><div className={styles.price}>R$ {preco}<span>/mês</span></div>
        <p>Preço proposto. Cobrança recorrente somente quando estiver ativa.</p>
        <ul><li><CheckCircle2 size={17}/> Análise e organização de ofertas</li><li><CheckCircle2 size={17}/> Comparação, simulação e teste da semana</li><li><CheckCircle2 size={17}/> IA conforme limites contratados</li><li><CheckCircle2 size={17}/> Conta individual</li></ul>
        <div className={styles.secondary} role="status" style={{justifyContent:'center'}}>Assinaturas em preparação</div>
        <small>A compra ainda não está liberada. Nenhum pagamento será cobrado agora.</small>
      </div>
    </section>
  </main>;
}
