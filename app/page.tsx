import Link from 'next/link';
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, FileSearch, Layers3, ShieldCheck, Target } from 'lucide-react';
import styles from './marketing.module.css';

export const metadata = {
  title: 'Caçador de Ofertas IA | Pesquise antes de anunciar',
  description: 'Organize anúncios e produtos, compare evidências e planeje seu próximo teste de tráfego com apoio da inteligência artificial.',
};

const recursos = [
  { icon: FileSearch, title: 'Radar de ofertas', description: 'Salve links, produtos, preços e referências de anúncios em um só lugar.' },
  { icon: BrainCircuit, title: 'Análise crítica com IA', description: 'Entenda sinais, riscos e lacunas a partir das evidências cadastradas.' },
  { icon: BarChart3, title: 'Teste da semana', description: 'Organize o orçamento, o checklist e o acompanhamento do seu próximo teste.' },
  { icon: Layers3, title: 'Dossiês e comparações', description: 'Compare oportunidades antes de decidir onde investir.' },
];

export default function Home() {
  return <main className={styles.page}>
    <header className={styles.header}><nav className={styles.nav}>
      <Link href="/" className={styles.brand}><Target size={26} /><span>CAÇADOR<span className={styles.green}>.IA</span></span></Link>
      <div className={styles.navActions}><a href="#recursos" className={styles.navDesktop}>Recursos</a><Link href="/login">Entrar</Link><Link href="/assinar" className={styles.navButton}>Ver plano <ArrowRight size={15}/></Link></div>
    </nav></header>

    <section className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>Inteligência de ofertas para tráfego direto</span>
        <h1>Pare de escolher ofertas <em>no escuro.</em></h1>
        <p>Links espalhados, dúvidas sobre o que testar e campanhas sem um plano? Organize oportunidades, compare evidências e use IA para decidir com mais critério.</p>
        <div className={styles.actions}><Link href="/assinar" className={styles.primary}>Conhecer o Caçador IA <ArrowRight size={18}/></Link><a className={styles.secondary} href="#como-funciona">Como funciona</a></div>
        <div className={styles.fine}><CheckCircle2 size={16}/> Para produtores digitais, afiliados e gestores de tráfego</div>
      </div>
      <div className={styles.mockup} aria-label="Representação ilustrativa do fluxo de pesquisa">
        <div className={styles.mockTop}><span/> <span/> <span/> <strong>SEU RADAR DE OFERTAS</strong></div>
        <div className={styles.mockTitle}><small>FLUXO DE ANÁLISE</small><h2>Pesquisa com método.</h2><p>Do anúncio encontrado até a hipótese de teste.</p></div>
        <div className={styles.mockRow}><FileSearch size={23}/><div><strong>01 · Guarde referências</strong><small>Ofertas, links, criativos e observações</small></div></div>
        <div className={styles.mockRow}><BrainCircuit size={23}/><div><strong>02 · Compare evidências</strong><small>Riscos e oportunidades com ajuda da IA</small></div></div>
        <div className={styles.mockRow}><BarChart3 size={23}/><div><strong>03 · Planeje seu teste</strong><small>Orçamento, custos e acompanhamento</small></div></div>
        <p className={styles.disclaimer}>Ilustração do fluxo. Não representa resultados ou anúncios reais.</p>
      </div>
    </section>

    <section className={styles.section} id="recursos">
      <div className={styles.sectionTitle}><span className={styles.eyebrow}>Menos achismo. Mais processo.</span><h2>Seu centro de pesquisa de ofertas.</h2><p>Uma ferramenta para transformar referências soltas em decisões de teste mais bem fundamentadas.</p></div>
      <div className={styles.features}>{recursos.map(({icon:Icon,title,description})=><article key={title}><div className={styles.featureIcon}><Icon size={22}/></div><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>

    <section className={styles.how} id="como-funciona"><div className={styles.sectionTitle}><span className={styles.eyebrow}>Como funciona</span><h2>Pesquise. Compare. Decida.</h2></div>
      <div className={styles.steps}><article><b>01</b><h3>Encontre uma referência</h3><p>Cadastre o produto e salve as informações públicas que conseguir verificar.</p></article><article><b>02</b><h3>Peça uma análise</h3><p>A IA organiza os dados e destaca pontos fortes, dúvidas e riscos.</p></article><article><b>03</b><h3>Faça um teste controlado</h3><p>Simule os custos, prepare o checklist e registre os resultados reais.</p></article></div>
    </section>

    <section className={styles.pricing} id="preco"><div className={styles.pricingIntro}><span className={styles.eyebrow}>Proposta de lançamento</span><h2>Pesquise melhor antes de gastar com anúncios.</h2><p>Assinatura mensal pensada para quem testa novas ofertas com frequência.</p><small>O lançamento pago depende de ativação do checkout, confirmação de pagamento e limites de uso de IA.</small></div>
      <div className={styles.priceCard}><strong>Caçador IA</strong><div className={styles.price}>R$ 49,90<span>/mês</span></div><p>Plano mensal de lançamento</p>
        <ul><li><CheckCircle2 size={17}/> Radar e dossiês de ofertas</li><li><CheckCircle2 size={17}/> Comparação e simulador</li><li><CheckCircle2 size={17}/> IA com limites definidos no lançamento</li><li><CheckCircle2 size={17}/> Acesso individual pelo navegador</li></ul>
        <Link href="/assinar" className={styles.primary}>Ver disponibilidade <ArrowRight size={17}/></Link><small>Nenhuma cobrança é realizada nesta página.</small>
      </div>
    </section>

    <section className={styles.faq}><h2>Perguntas frequentes</h2>
      <details><summary>O Caçador garante uma oferta vencedora?</summary><p>Não. O sistema auxilia na pesquisa e na organização das evidências. Uma pontuação não comprova vendas nem lucro.</p></details>
      <details><summary>Ele verifica todos os anúncios automaticamente?</summary><p>Não. Algumas consultas públicas são feitas sob demanda e podem ser limitadas pela plataforma. Os dados indisponíveis devem ser registrados manualmente.</p></details>
      <details><summary>Preciso ter um produto pronto?</summary><p>Você pode pesquisar ideias antes de produzir. Para anunciar, precisará de um produto legítimo, página de vendas, checkout e entrega.</p></details>
    </section>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} Caçador de Ofertas IA</span><span>Inteligência de pesquisa, sem promessa de faturamento.</span><Link href="/login">Acesso ao sistema</Link></footer>
  </main>;
}
