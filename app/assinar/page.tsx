import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import styles from '../marketing.module.css';

export const metadata = { title: 'Plano mensal | Caçador de Ofertas IA' };

export default function Assinar() {
  const preco = process.env.NEXT_PUBLIC_CACADOR_LAUNCH_PRICE || '49,90';
  // Sem webhook de pagamento em produção, o botão de compra permanece desativado.
  // Habilite apenas quando a integração de pagamentos estiver operacional e testada.
  const ready = process.env.CACADOR_PAYMENTS_READY === 'true'
    && process.env.CACADOR_BILLING_ENFORCED === 'true';
  const configuredUrl = process.env.CACADOR_CHECKOUT_URL || '';
  const checkout = ready && /^https:\/\//i.test(configuredUrl) ? configuredUrl : null;

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
        {checkout ? <a className={styles.primary} href={checkout} rel="noopener noreferrer">Ir para o checkout <ArrowRight size={17}/></a> : <div className={styles.secondary} role="status" style={{justifyContent:'center'}}>Assinaturas em preparação</div>}
        <small>{checkout ? 'O pagamento acontece em um checkout externo seguro.' : 'A compra ainda não está liberada. Nenhum pagamento será cobrado agora.'}</small>
      </div>
    </section>
  </main>;
}
