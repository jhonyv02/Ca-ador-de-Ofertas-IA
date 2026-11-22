import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, BarChart3, BrainCircuit, Check, CheckCircle2,
  ChevronRight, ClipboardCheck, Compass, FileSearch, GitCompareArrows,
  Globe2, Layers3, LockKeyhole, Search, ShieldCheck, Sparkles, Target,
  Wallet, X,
} from 'lucide-react';
import styles from './marketing.module.css';

export const metadata = {
  title: 'Caçador de Ofertas IA — Decida o que testar com mais critério',
  description: 'Uma central para pesquisar anúncios e produtos, comparar oportunidades e planejar seus testes de tráfego direto com apoio de inteligência artificial.',
  openGraph: {
    title: 'Caçador de Ofertas IA — Seu radar de oportunidades',
    description: 'Organize evidências, compare ofertas e planeje seu próximo teste.',
    type: 'website',
  },
};

const features = [
  {
    icon: Compass,
    tag: 'PESQUISA ORGANIZADA',
    title: 'Radar de ofertas',
    text: 'Centralize produtos, links, promessas, preços e referências de anúncios. Chega de perder aquela oferta interessante em vinte abas abertas.',
    className: styles.featureWide,
  },
  {
    icon: BrainCircuit,
    tag: 'ANÁLISE COM IA',
    title: 'Enxergue os riscos antes do teste',
    text: 'Analise os sinais documentados de uma oportunidade, pontos fracos e o que ainda precisa ser verificado.',
    className: styles.featureStandard,
  },
  {
    icon: GitCompareArrows,
    tag: 'DECISÃO',
    title: 'Compare sem achismo',
    text: 'Coloque ofertas lado a lado para organizar sua decisão de qual merece mais pesquisa.',
    className: styles.featureStandard,
  },
  {
    icon: ClipboardCheck,
    tag: 'ROTINA DE EXECUÇÃO',
    title: 'Teste da semana',
    text: 'Tenha um roteiro de preparação: margem, entrega, checkout, criativo e verba de teste.',
    className: styles.featureStandard,
  },
  {
    icon: Wallet,
    tag: 'SIMULAÇÃO',
    title: 'Saiba seu teto de CPA',
    text: 'Simule custos e cenários de campanha antes de colocar seu dinheiro em tráfego.',
    className: styles.featureStandard,
  },
  {
    icon: Globe2,
    tag: 'OPERAÇÃO EM UM LUGAR',
    title: 'Pesquisa de páginas e anúncios',
    text: 'Guarde referências e desenvolva páginas próprias a partir do que descobriu — sem depender de copiar materiais de terceiros.',
    className: styles.featureWide,
  },
];

const comparison = [
  ['Links espalhados por todo lado', 'Tudo organizado por oportunidade'],
  ['Escolher pelo anúncio mais bonito', 'Comparar critérios e evidências'],
  ['Subir campanha sem calcular os custos', 'Simular a margem antes de testar'],
  ['Esquecer o que foi testado', 'Registrar decisões e resultados reais'],
];

const plans = [
  'Radar de produtos e anúncios',
  'Análises críticas com IA*',
  'Comparação de oportunidades',
  'Teste da semana e simulador',
  'Histórico de pesquisas e testes',
  'Acesso individual pelo navegador',
];

function DemoDashboard() {
  const opportunities = [
    { name: 'Oferta digital em pesquisa', detail: 'Produto digital · Brasil', status: 'Em análise', tone: 'blue' },
    { name: 'Referência de outro mercado', detail: 'Pesquisa internacional', status: 'Verificar dados', tone: 'amber' },
    { name: 'Ideia de miniapp', detail: 'Oportunidade cadastrada', status: 'Rascunho', tone: 'neutral' },
  ];
  return (
    <div className={styles.productWrap}>
      <div className={styles.productGlow} aria-hidden="true"/>
      <div className={styles.productWindow} aria-label="Prévia ilustrativa da interface do Caçador de Ofertas IA">
        <div className={styles.windowChrome}>
          <div className={styles.trafficLights}><i/><i/><i/></div>
          <div className={styles.addressBar}><LockKeyhole size={11}/> Caçador de Ofertas IA / radar</div>
          <span className={styles.chromeNote}>PRÉVIA DO PRODUTO</span>
        </div>
        <div className={styles.dashboardBody}>
          <aside className={styles.demoSide}>
            <div className={styles.demoLogo}><span><Target size={18}/></span><b>CAÇADOR<span>.IA</span></b></div>
            <small>ÁREA DE TRABALHO</small>
            <div className={styles.demoItemActive}><Layers3 size={14}/> Visão geral</div>
            <div className={styles.demoItem}><Search size={14}/> Radar de ofertas</div>
            <div className={styles.demoItem}><FileSearch size={14}/> Anúncios</div>
            <div className={styles.demoItem}><BrainCircuit size={14}/> Teste da semana</div>
            <div className={styles.demoItem}><BarChart3 size={14}/> Simulador</div>
            <div className={styles.demoBottom}><span className={styles.demoAvatar}>C</span><div>Minha conta<small>Área privada</small></div></div>
          </aside>
          <div className={styles.demoMain}>
            <div className={styles.demoTop}><span>Visão geral <ChevronRight size={12}/> Radar</span><span className={styles.demoTopRight}><span className={styles.pulseDot}/> Área de pesquisa</span></div>
            <div className={styles.demoMainPad}>
              <div className={styles.demoHeading}><div><small>SEU ESPAÇO DE INTELIGÊNCIA</small><h3>Radar de oportunidades</h3><p>Organize o que encontrou. Escolha o que investigar.</p></div><div className={styles.demoNew}><span>+</span> Nova oferta</div></div>
              <div className={styles.demoStats}>
                <div><span><Layers3 size={15}/> Ofertas salvas</span><strong>—</strong><small>Seu catálogo de pesquisa</small></div>
                <div><span><FileSearch size={15}/> Anúncios salvos</span><strong>—</strong><small>Evidências organizadas</small></div>
                <div><span><BarChart3 size={15}/> Testes registrados</span><strong>—</strong><small>Acompanhamento real</small></div>
              </div>
              <div className={styles.demoContentGrid}>
                <div className={styles.demoTable}>
                  <div className={styles.demoPanelHeading}><div><strong>Oportunidades recentes</strong><small>Exemplos de organização</small></div><span>Ver todas <ArrowUpRight size={11}/></span></div>
                  {opportunities.map((o) => <div key={o.name} className={styles.demoOffer}>
                    <span className={styles.demoOfferIcon}><Target size={15}/></span>
                    <div className={styles.demoOfferContent}><strong>{o.name}</strong><small>{o.detail}</small></div>
                    <span className={o.tone === 'blue' ? styles.tagBlue : o.tone === 'amber' ? styles.tagAmber : styles.tagMuted}>{o.status}</span>
                  </div>)}
                  <div className={styles.demoTableFoot}><CheckCircle2 size={13}/> Tudo no mesmo lugar, pronto para comparar</div>
                </div>
                <div className={styles.demoInsight}>
                  <div className={styles.insightIcon}><BrainCircuit size={17}/></div>
                  <small>ANÁLISE CRÍTICA</small>
                  <h4>O que falta antes de anunciar?</h4>
                  <p>Preço, custos, checkout, criativo e entrega: transforme dúvidas em um checklist.</p>
                  <div className={styles.insightCheck}><Check size={12}/> Comparar oportunidades</div>
                  <div className={styles.insightCheck}><Check size={12}/> Simular custos</div>
                  <div className={styles.insightCheck}><Check size={12}/> Planejar o teste</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.demoCaption}><ShieldCheck size={13}/> Demonstração ilustrativa da organização do sistema; não exibe dados, lucros ou resultados reais.</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navegação principal">
          <Link href="/" className={styles.brand} aria-label="Caçador IA, início"><span className={styles.brandSymbol}><Target size={20}/></span><span>CAÇADOR<span className={styles.green}>.IA</span></span></Link>
          <div className={styles.navMiddle}>
            <a href="#produto">O produto</a><a href="#recursos">Funcionalidades</a><a href="#como-funciona">Como funciona</a><a href="#preco">Planos</a>
          </div>
          <div className={styles.navActions}><Link href="/login" className={styles.loginLink}>Entrar</Link><Link href="/assinar" className={styles.navButton}>Conhecer o plano <ArrowRight size={15}/></Link></div>
        </nav>
      </header>

      <section className={styles.hero} id="produto">
        <div className={styles.orbOne} aria-hidden="true"/><div className={styles.orbTwo} aria-hidden="true"/>
        <div className={styles.heroCopy}>
          <div className={styles.heroPill}><span className={styles.pulseDot}/> INTELIGÊNCIA PARA QUEM TESTA OFERTAS <ArrowUpRight size={13}/></div>
          <h1>Seu próximo teste começa com <em>evidências.</em><span> Não com achismo.</span></h1>
          <p>Encontre uma oferta interessante. Organize os anúncios, compare possibilidades e descubra o que precisa validar <strong>antes de colocar dinheiro em tráfego.</strong></p>
          <div className={styles.actions}><Link href="/assinar" className={styles.primary}>Conhecer o Caçador IA <ArrowRight size={18}/></Link><a className={styles.secondary} href="#como-funciona">Veja como funciona <ChevronRight size={16}/></a></div>
          <div className={styles.heroTrust}><span><CheckCircle2 size={16}/> Feito para tráfego direto</span><span><CheckCircle2 size={16}/> Pesquisa com IA</span><span><CheckCircle2 size={16}/> Acesso pelo navegador</span></div>
        </div>
        <DemoDashboard/>
      </section>

      <section className={styles.audienceBand} aria-label="Para quem é o Caçador IA">
        <div>Um único espaço para quem trabalha com <strong>afiliados</strong><span>·</span><strong>produtos digitais</strong><span>·</span><strong>tráfego pago</strong><span>·</span><strong>micro-SaaS</strong></div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.problemHeading}><span className={styles.eyebrow}>MENOS ABAS. MAIS CLAREZA.</span><h2>O problema não é faltar ideia.<br/><span>É saber qual vale o teste.</span></h2><p>Ter dezenas de links salvos não é ter uma estratégia. Transforme referências isoladas em uma pesquisa que você consegue acompanhar.</p></div>
        <div className={styles.problemTable}>
          <div className={styles.problemLabels}><span>SEM UM PROCESSO</span><span>COM O CAÇADOR IA</span></div>
          {comparison.map(([before,after])=><div key={before} className={styles.compareRow}><div><X size={16}/>{before}</div><div><Check size={16}/>{after}</div></div>)}
        </div>
      </section>

      <section className={styles.featuresSection} id="recursos">
        <div className={styles.sectionHead}><span className={styles.eyebrow}>TUDO EM UM SÓ LUGAR</span><h2>Uma central de pesquisa.<br/><span>Um fluxo de decisão.</span></h2><p>Da primeira referência ao planejamento da campanha, tudo organizado para você parar de recomeçar a pesquisa do zero.</p></div>
        <div className={styles.featureGrid}>
          {features.map(({icon:Icon,tag,title,text,className})=><article className={styles.featureCard+' '+className} key={title}><div className={styles.featureIcon}><Icon size={22}/></div><small>{tag}</small><h3>{title}</h3><p>{text}</p><span className={styles.featureMark}><ArrowUpRight size={18}/></span></article>)}
        </div>
      </section>

      <section className={styles.workflowSection} id="como-funciona">
        <div className={styles.sectionHead}><span className={styles.eyebrow}>COMO FUNCIONA</span><h2>Da pesquisa ao teste,<br/><span>sem perder o fio.</span></h2><p>Três passos para sair do palpite e construir uma hipótese mais consistente.</p></div>
        <div className={styles.steps}>
          <article><div className={styles.stepIndex}>01 <span><Search size={21}/></span></div><h3>Cadastre a oportunidade</h3><p>Salve link, nicho, preço, promessa e as evidências públicas que encontrar.</p></article>
          <article><div className={styles.stepIndex}>02 <span><BrainCircuit size={21}/></span></div><h3>Analise e compare</h3><p>Use a IA para identificar pontos fortes, dúvidas e o que ainda precisa verificar.</p></article>
          <article><div className={styles.stepIndex}>03 <span><BarChart3 size={21}/></span></div><h3>Planeje com números</h3><p>Simule os custos, prepare a estrutura de vendas e registre seus testes reais.</p></article>
        </div>
      </section>

      <section className={styles.pricingSection} id="preco">
        <div className={styles.pricingInner}>
          <div className={styles.pricingIntro}>
            <span className={styles.eyebrow}>SEU ESPAÇO DE INTELIGÊNCIA</span><h2>Uma decisão ruim pode custar bem mais que uma mensalidade.</h2>
            <p>Pesquise com método, mantenha histórico das suas ideias e decida o próximo teste com mais contexto.</p>
            <div className={styles.priceQuote}><Sparkles size={19}/><span>Não é uma promessa de vendas. É uma ferramenta para tomar decisões mais informadas.</span></div>
          </div>
          <div className={styles.priceCard}>
            <div className={styles.priceTop}><span>PLANO DE LANÇAMENTO</span><span className={styles.planPill}>Mensal</span></div>
            <h3>Caçador IA</h3><p>Seu radar de ofertas e testes.</p>
            <div className={styles.price}>R$ 49,90<span>/mês</span></div>
            <p className={styles.priceSmall}>Assinatura recorrente via Mercado Pago após ativação do checkout.</p>
            <div className={styles.priceDivider}/>
            <strong className={styles.includes}>O que está incluído</strong>
            <ul>{plans.map(item=><li key={item}><CheckCircle2 size={17}/>{item}</li>)}</ul>
            <Link href="/assinar" className={styles.primary}>Ver plano e disponibilidade <ArrowRight size={17}/></Link>
            <small>* Limites de uso da IA e termos serão informados antes de abrir as vendas. O checkout ainda está em preparação.</small>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} id="perguntas">
        <div className={styles.faqInner}>
          <div><span className={styles.eyebrow}>DÚVIDAS FREQUENTES</span><h2>Perguntas que fazem sentido.</h2><p>Sem números inventados nem promessa de produto vencedor.</p></div>
          <div className={styles.faqList}>
            <details><summary>O Caçador encontra ofertas vencedoras automaticamente? <span>+</span></summary><p>Ele ajuda a organizar e avaliar oportunidades. Algumas consultas são sob demanda e podem depender dos dados que você fornecer. Não há garantia de vendas ou lucro.</p></details>
            <details><summary>Preciso saber mexer em ferramentas de análise? <span>+</span></summary><p>Não precisa ser especialista. Você pode começar cadastrando uma oferta, salvando informações e usando o simulador para planejar um teste.</p></details>
            <details><summary>Posso usar no celular? <span>+</span></summary><p>Sim. O painel é responsivo e foi desenvolvido para funcionar no navegador de celulares e computadores.</p></details>
            <details><summary>Como funciona a assinatura? <span>+</span></summary><p>O plano previsto é R$ 49,90 por mês pelo Mercado Pago. A cobrança ainda não foi ativada; quando estiver disponível, a confirmação de pagamento será necessária para liberar o acesso.</p></details>
            <details><summary>Ele substitui a validação de um produto? <span>+</span></summary><p>Não. O Caçador organiza hipóteses, anúncios públicos e custos. Você continua responsável por confirmar demanda, direitos de uso, checkout, entrega e resultados reais.</p></details>
          </div>
        </div>
      </section>

      <section className={styles.bottomCta}><div className={styles.bottomGlow}/><span className={styles.eyebrow}>PESQUISA ANTES DE TRÁFEGO</span><h2>Menos tentativas no escuro.<br/><span>Mais decisões com contexto.</span></h2><p>Organize suas próximas oportunidades em um painel feito para quem vive de testar ideias.</p><Link href="/assinar" className={styles.primary}>Conhecer o plano mensal <ArrowRight size={18}/></Link></section>

      <footer className={styles.footer}><Link href="/" className={styles.brand}><span className={styles.brandSymbol}><Target size={18}/></span>CAÇADOR<span className={styles.green}>.IA</span></Link><span>© {new Date().getFullYear()} Caçador de Ofertas IA. Pesquisa não é garantia de resultado.</span><div><a href="#recursos">Recursos</a><a href="#perguntas">Dúvidas</a><Link href="/login">Acessar</Link></div></footer>
    </main>
  );
}
