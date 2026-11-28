'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {useWorkspace} from '@/components/workspace';
import {Feedback} from '@/components/ui';
import {serializeSalesDraft,type SalesPageDraft} from '@/lib/sales-page';

const markets=[
{code:'br',country:'Brasil',locale:'pt-BR',currency:'BRL',price:29.90,heading:'Sua casa não precisa de mais um dia inteiro de faxina. Precisa de uma rotina.',intro:'Organize a casa em pequenos passos, no seu ritmo. Veja suas tarefas do dia e acompanhe cada conquista.',pain:'Quando tudo fica para o fim de semana, até começar parece difícil.',benefits:['Rotina personalizada para sua casa','Calendário e tarefas por cômodo','Desafios de organização, XP e medalhas','Acompanhe seu progresso sem pressão'],steps:['Conte como é sua casa','Escolha seu tempo disponível','Siga pequenas missões e acompanhe sua evolução'],cta:'Quero organizar minha casa',offer:'Acesso ao CasaLeve',once:'Pagamento único previsto',pending:'Prévia de lançamento. Vendas ainda indisponíveis.',faqTitle:'Perguntas frequentes',faq:[{question:'É um PDF?',answer:'Não. A proposta é um aplicativo web interativo.'},{question:'Preciso de assinatura?',answer:'O modelo planejado é pagamento único.'},{question:'Já posso comprar?',answer:'Não. A versão comercial e o checkout ainda estão em preparação.'}],labels:['Por que mudar a rotina?','Uma casa em ordem, no seu ritmo','Como funciona']},
{code:'de',country:'Alemanha',locale:'de-DE',currency:'EUR',price:19.90,heading:'Dein Zuhause braucht keinen ganzen Putztag. Es braucht eine Routine.',intro:'Organisiere dein Zuhause Schritt für Schritt. Sieh deine täglichen Aufgaben und verfolge deine Fortschritte.',pain:'Wenn alles bis zum Wochenende liegen bleibt, fällt selbst der Anfang schwer.',benefits:['Individuelle Putzroutine für dein Zuhause','Kalender und Aufgaben nach Räumen','Aufräum-Challenges, XP und Abzeichen','Fortschritte ohne Druck verfolgen'],steps:['Beschreibe dein Zuhause','Wähle die verfügbare Zeit','Erledige kleine Aufgaben und verfolge deinen Fortschritt'],cta:'Ich möchte mein Zuhause organisieren',offer:'Zugang zu CasaLeve',once:'Geplante Einmalzahlung',pending:'Vorschau vor dem Start. Noch nicht erhältlich.',faqTitle:'Häufige Fragen',faq:[{question:'Ist das ein PDF?',answer:'Nein. Geplant ist eine interaktive Web-App.'},{question:'Brauche ich ein Abonnement?',answer:'Vorgesehen ist eine Einmalzahlung.'},{question:'Kann ich schon kaufen?',answer:'Nein. Die Verkaufsversion und die Zahlungsabwicklung sind noch in Vorbereitung.'}],labels:['Warum die Routine ändern?','Ein ordentliches Zuhause in deinem Tempo','So funktioniert es']},
{code:'es',country:'Espanha',locale:'es-ES',currency:'EUR',price:14.90,heading:'Tu casa no necesita otro día entero de limpieza. Necesita una rutina.',intro:'Organiza tu hogar poco a poco, a tu ritmo. Consulta tus tareas diarias y celebra tus avances.',pain:'Cuando todo se acumula para el fin de semana, hasta empezar cuesta.',benefits:['Rutina personalizada para tu hogar','Calendario y tareas por estancia','Retos de organización, XP y medallas','Sigue tus avances sin presión'],steps:['Cuéntanos cómo es tu casa','Elige el tiempo disponible','Completa pequeñas tareas y sigue tus avances'],cta:'Quiero organizar mi casa',offer:'Acceso a CasaLeve',once:'Pago único previsto',pending:'Vista previa del lanzamiento. Todavía no está a la venta.',faqTitle:'Preguntas frecuentes',faq:[{question:'¿Es un PDF?',answer:'No. La propuesta es una aplicación web interactiva.'},{question:'¿Necesito una suscripción?',answer:'Está previsto un pago único.'},{question:'¿Ya puedo comprarlo?',answer:'No. La versión comercial y el pago todavía están en preparación.'}],labels:['¿Por qué cambiar de rutina?','Tu casa en orden, a tu ritmo','Cómo funciona']},
{code:'mx',country:'México',locale:'es-MX',currency:'MXN',price:249,heading:'Tu casa no necesita otro día entero de limpieza. Necesita una rutina.',intro:'Organiza tu hogar poco a poco. Revisa tus pendientes del día y celebra cada logro.',pain:'Cuando dejas todo para el fin de semana, hasta empezar se vuelve pesado.',benefits:['Rutina personalizada para tu casa','Calendario y tareas por habitación','Retos de organización, XP y medallas','Consulta tus avances sin presión'],steps:['Cuéntanos cómo es tu casa','Elige cuánto tiempo tienes','Completa pequeñas misiones y revisa tus avances'],cta:'Quiero organizar mi casa',offer:'Acceso a CasaLeve',once:'Pago único previsto',pending:'Vista previa del lanzamiento. Aún no está a la venta.',faqTitle:'Preguntas frecuentes',faq:[{question:'¿Es un PDF?',answer:'No. La propuesta es una aplicación web interactiva.'},{question:'¿Tengo que pagar cada mes?',answer:'El modelo previsto es de pago único.'},{question:'¿Ya lo puedo comprar?',answer:'No. La versión comercial y el cobro aún están en preparación.'}],labels:['¿Por qué cambiar tu rutina?','Una casa en orden, a tu ritmo','Cómo funciona']},
{code:'us',country:'Estados Unidos',locale:'en-US',currency:'USD',price:19.90,heading:'Your home doesn’t need another full day of cleaning. It needs a routine.',intro:'Get organized one small step at a time. See today’s chores and celebrate your progress.',pain:'When everything piles up until the weekend, even getting started can feel overwhelming.',benefits:['A cleaning routine tailored to your home','Calendar and room-by-room tasks','Organizing challenges, XP and badges','Track your progress at your own pace'],steps:['Tell us about your home','Choose how much time you have','Complete small tasks and track your progress'],cta:'I want to organize my home',offer:'Access to CasaLeve',once:'Planned one-time payment',pending:'Prelaunch preview. Not yet available for purchase.',faqTitle:'Frequently asked questions',faq:[{question:'Is this a PDF?',answer:'No. The planned product is an interactive web app.'},{question:'Do I need a subscription?',answer:'The planned pricing model is a one-time payment.'},{question:'Can I buy it now?',answer:'Not yet. The commercial release and checkout are still being prepared.'}],labels:['Why change your routine?','An organized home at your own pace','How it works']}
] as const;
type Market=(typeof markets)[number];
const marker=(m:Market)=>'#produto-proprio:casaleve:'+m.code;
const money=(m:Market)=>new Intl.NumberFormat(m.locale,{style:'currency',currency:m.currency}).format(m.price);
function draft(m:Market):SalesPageDraft {
  return {brand:'CasaLeve',eyebrow:m.pending,headline:m.heading,subheadline:m.intro,painTitle:m.labels[0],painBody:m.pain,benefitsTitle:m.labels[1],benefits:[...m.benefits],offerTitle:m.offer,includes:[...m.benefits],stepsTitle:m.labels[2],steps:[...m.steps],faqTitle:m.faqTitle,faq:m.faq.map(q=>({...q})),ctaText:m.cta,finalTitle:m.heading,finalBody:m.pending,accent:'#6c8d64',imageUrl:'',visualStyle:'light',ownOfferPrice:money(m),pricingTitle:m.once,proofItems:[],bonusItems:[],gallery:[],galleryTitle:m.labels[1],guaranteeText:'',differentiation:'Aplicativo de organização doméstica com rotinas, desafios e progresso, em vez de PDF estático.',actualContents:'Protótipo local: rotinas, calendário, desafios, XP, medalhas e biblioteca. Sincronização, ranking real, login e checkout ainda pendentes.'};
}
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function preview(m:Market){
  const e=escape;
  return '<!doctype html><html lang="'+m.locale+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>CasaLeve</title><style>'+
  '*{box-sizing:border-box}body{margin:0;background:#faf7ef;color:#263f32;font:16px/1.6 system-ui,sans-serif}main,header{max-width:1000px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-weight:800}h1{font-size:clamp(32px,6vw,58px);line-height:1.1;letter-spacing:-.04em;margin:12px 0}h2{font-size:27px;line-height:1.2}section{margin:20px 0;padding:clamp(20px,4vw,36px);border-radius:24px;background:#fff;border:1px solid #e1e5d9} .hero{background:#e6eddf}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}.tile{background:#f4f0e6;padding:18px;border-radius:16px}.price{font-size:40px;font-weight:800}.button{display:block;border:0;background:#dce4d6;color:#334f3a;border-radius:14px;padding:16px;font-size:16px;width:100%;font-weight:700}small{display:block;margin:12px 0;color:#475d4c}details{padding:14px 0;border-bottom:1px solid #e1e5d9}summary{font-weight:700;cursor:pointer}footer{text-align:center;padding:24px}</style></head><body><header><span>⌂ CasaLeve</span><span>'+e(m.pending)+'</span></header><main><section class="hero"><h1>'+e(m.heading)+'</h1><p>'+e(m.intro)+'</p><button class="button" disabled>'+e(m.cta)+'</button><small>'+e(m.pending)+'</small></section><section><h2>'+e(m.labels[0])+'</h2><p>'+e(m.pain)+'</p></section><section><h2>'+e(m.labels[1])+'</h2><div class="grid">'+m.benefits.map(b=>'<div class="tile">✓ '+e(b)+'</div>').join('')+'</div></section><section><h2>'+e(m.labels[2])+'</h2><ol>'+m.steps.map(s=>'<li>'+e(s)+'</li>').join('')+'</ol></section><section><h2>'+e(m.offer)+'</h2><div class="price">'+e(money(m))+'</div><p>'+e(m.once)+'</p><button class="button" disabled>'+e(m.cta)+'</button><small>'+e(m.pending)+'</small></section><section><h2>'+e(m.faqTitle)+'</h2>'+m.faq.map(q=>'<details><summary>'+e(q.question)+'</summary><p>'+e(q.answer)+'</p></details>').join('')+'</section></main><footer>CasaLeve · '+e(m.pending)+'</footer></body></html>';
}
function download(m:Market){
  const url=URL.createObjectURL(new Blob([preview(m)],{type:'text/html;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='casaleve-'+m.code+'.html';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function CasaLeveLaunch(){
  const {supabase,products,refresh,loading}=useWorkspace();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [selected,setSelected]=useState<Market|null>(null);
  const lock=useRef(false);
  async function register(){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error('Entre na conta do Caçador para cadastrar a oferta.');
      const {data:rows,error:readError}=await supabase.from('products').select('name,notes').eq('user_id',user.id);
      if(readError)throw readError;
      const existing=rows||[];
      const missing=markets.filter(m=>!existing.some(p=>String(p.notes||'').split('\n').includes(marker(m))||String(p.name).trim().toLowerCase()===('CasaLeve — '+m.country).toLowerCase()));
      if(missing.length){
        const {error:writeError}=await supabase.from('products').insert(missing.map(m=>({
          user_id:user.id,name:'CasaLeve — '+m.country,niche:'Organização doméstica e hábitos',product_type:'saas',format:'app',
          country:m.country,language:m.locale,currency:m.currency,sale_price:m.price,fulfillment_cost:null,extra_cost:null,
          landing_url:'',checkout_url:'',landing_copy:serializeSalesDraft(draft(m)),promise:m.heading,
          target_audience:'Adultos e famílias que desejam organizar a rotina doméstica.',
          notes:[marker(m),'#formato-digital:app','Produto próprio em desenvolvimento; pagamento único previsto.','Referência de mercado: https://cleaning-planner.online/de/ (não é a nossa página).','Não há vendas ou anúncios próprios validados. Não iniciar tráfego antes de validar o app, login, checkout, entrega, suporte e eventos.','Ranking real e sincronização familiar dependem de banco e autenticação.','Custos ainda desconhecidos; calcular CPA somente após informar taxas, impostos e custo operacional.'].join('\n'),
          status:'researching',weekly_pick:false,difficulty:'dificil'
        })));
        if(writeError)throw writeError;
      }
      await refresh();setMessage(missing.length+' mercado(s) cadastrado(s); registros existentes preservados.');
    }catch(e){setError(e instanceof Error?e.message:((e as {message?:string})?.message||'Não foi possível cadastrar os mercados.'))}
    finally{lock.current=false;setBusy(false);}
  }
  return <section className="panel" style={{padding:20,marginBottom:24}}>
    <div className="micro">PRODUTO PRÓPRIO · CASALEVE</div>
    <h2>Preparar lançamento internacional</h2>
    <p className="muted">Cinco mercados, um aplicativo. Rascunhos autorais, sem checkout ativo, anúncios ou vendas presumidas.</p>
    <button className="btn btn-primary" type="button" disabled={busy||loading} onClick={()=>void register()}>{busy?'Cadastrando…':'Cadastrar mercados no Caçador'}</button>
    {error&&<Feedback type="error">{error}</Feedback>}{message&&<Feedback type="success">{message}</Feedback>}
    <div className="card-grid mt-3">{markets.map(m=>{
      const product=products.find(p=>String(p.notes||'').split('\n').includes(marker(m))||p.name==='CasaLeve — '+m.country);
      return <article className="panel" style={{padding:14}} key={m.code}><strong>{m.country}</strong><p>{money(m)} · {m.locale}</p>
        <p className="muted">{m.heading}</p><div className="flex wrap gap-2"><button type="button" className="btn" onClick={()=>setSelected(m)}>Prévia</button><button type="button" className="btn" onClick={()=>download(m)}>Baixar HTML</button>
        {product&&<Link className="btn" href={'/products/'+product.id+'/remodelar'}>Editar copy</Link>}</div></article>;
    })}</div>
    {selected&&<div className="panel mt-3" style={{padding:12}}><div className="flex between center"><strong>{selected.country} · Prévia</strong><button type="button" className="btn" onClick={()=>setSelected(null)}>Fechar</button></div><iframe title={'Prévia CasaLeve '+selected.country} sandbox="" srcDoc={preview(selected)} style={{width:'100%',height:680,border:0,marginTop:12}}/></div>}
    <p className="micro mt-2">As prévias HTML são independentes, localizadas e bloqueadas para vendas. O editor geral pode conter textos em português; revise o HTML final, acrescente capturas reais do aplicativo e configure o checkout antes de publicar.</p>
  </section>;
}
