'use client';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Calculator, CirclePlus, Download, Plus, Save, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { PageHeading, Section, Empty, Field, Feedback, Load } from '@/components/ui';
import { brl, shortDate } from '@/lib/utils';
function SimulatorCore(){
 const params=useSearchParams();const {products,testRuns,loading,refresh,supabase}=useWorkspace();
 const initial=params.get('product')||'';const [productId,setProductId]=useState(initial);const [budget,setBudget]=useState('120');const [cpc,setCpc]=useState('1.20');const [conversion,setConversion]=useState('1.5');const [spend,setSpend]=useState('');const [clicks,setClicks]=useState('');const [leads,setLeads]=useState('');const [sales,setSales]=useState('');const [revenue,setRevenue]=useState('');const [startDate,setStartDate]=useState(new Date().toISOString().slice(0,10));const [notes,setNotes]=useState('');const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('');
 const p=products.find(p=>p.id===productId);const price=Number(p?.sale_price||0);const variableCosts=Number(p?.fulfillment_cost||0)+Number(p?.extra_cost||0);const contribution=price-variableCosts;const cash=Number(budget||0);const clickCost=Number(cpc||0);const pct=Number(conversion||0)/100;
 const impressionsGuess=null;const expectedClicks=clickCost>0?cash/clickCost:0;const expectedSales=expectedClicks*pct;const expectedRevenue=expectedSales*price;const expectedResult=expectedSales*contribution-cash;const breakEvenCpa=contribution;
 const historical=testRuns.filter(r=>!productId||r.product_id===productId);
 async function save(e:React.FormEvent){e.preventDefault();setError('');setSuccess('');setSaving(true);
  try{if(!productId)throw new Error('Selecione o produto.');const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Faça login novamente.');
   const nums=[budget,spend,clicks,leads,sales,revenue].map(x=>Number(x||0));if(nums.some(x=>!Number.isFinite(x)||x<0))throw new Error('Use somente números positivos.');
   const {error}=await supabase.from('test_runs').insert({user_id:user.id,product_id:productId,start_date:startDate,budget:Number(budget||0),spend:Number(spend||0),clicks:Number(clicks||0),leads:Number(leads||0),sales:Number(sales||0),revenue:Number(revenue||0),notes});if(error)throw error;await refresh();setSuccess('Teste registrado!');setSpend('');setSales('');setRevenue('');setClicks('');setLeads('');setNotes('');
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar');}finally{setSaving(false);}}
 async function remove(id:string){if(!confirm('Excluir este registro de teste?'))return;const {error}=await supabase.from('test_runs').delete().eq('id',id);if(error)setError(error.message);else await refresh();}
 return <><PageHeading eyebrow="PLANEJAMENTO" title="Simulador de testes" description="Projeções por cenário e registro dos seus resultados reais em tráfego pago."/>
 {loading?<Load/>:<>
 <div className="two-col"><div><Section title="Planejamento da campanha" description="Este simulador usa suas próprias premissas; não prevê conversão real."><div className="form-grid">
 <Field label="Produto"><select className="input" value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione</option>{products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
 <Field label="Orçamento total"><input className="input" type="number" min="0" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></Field>
 <Field label="CPC hipotético"><input className="input" type="number" min="0.01" step="0.01" value={cpc} onChange={e=>setCpc(e.target.value)}/></Field>
 <Field label="Taxa de conversão hipotética (%)"><input className="input" type="number" min="0" max="100" step="0.1" value={conversion} onChange={e=>setConversion(e.target.value)}/></Field>
 </div><div className="stats-grid mt-3" style={{gridTemplateColumns:'1fr 1fr'}}><div className="stat"><div><div className="stat-label">Cliques estimados</div><div className="stat-value">{Math.round(expectedClicks)}</div></div></div><div className="stat"><div><div className="stat-label">Vendas estimadas</div><div className="stat-value">{expectedSales.toFixed(1)}</div></div></div><div className="stat"><div><div className="stat-label">Receita estimada</div><div className="stat-value" style={{fontSize:20}}>{brl(expectedRevenue,p?.currency)}</div></div></div><div className="stat"><div><div className="stat-label">Resultado variável</div><div className="stat-value" style={{fontSize:20,color:expectedResult>=0?'#3ce0a1':'#f79b9e'}}>{brl(expectedResult,p?.currency)}</div></div></div></div>
 <div className="info-note">CPA máximo estimado para empatar: <strong>{p&&p.sale_price!==null?brl(breakEvenCpa,p.currency):'Informe o preço e custos do produto'}</strong>. Não inclui impostos não cadastrados, custos fixos, reembolsos, escala e atribuição.</div>
 </Section></div>
 <div><Section title="Registrar teste realizado" description="Preencha com números reais obtidos no gerenciador ou checkout."><form className="form-grid" onSubmit={save}>
 <Field label="Data do teste"><input type="date" className="input" required value={startDate} onChange={e=>setStartDate(e.target.value)}/></Field><Field label="Orçamento planejado"><input type="number" min="0" className="input" value={budget} onChange={e=>setBudget(e.target.value)}/></Field>
 <Field label="Gasto em anúncios"><input type="number" min="0" step="0.01" className="input" value={spend} onChange={e=>setSpend(e.target.value)}/></Field><Field label="Cliques"><input type="number" min="0" className="input" value={clicks} onChange={e=>setClicks(e.target.value)}/></Field>
 <Field label="Leads / checkouts"><input type="number" min="0" className="input" value={leads} onChange={e=>setLeads(e.target.value)}/></Field><Field label="Vendas"><input type="number" min="0" className="input" value={sales} onChange={e=>setSales(e.target.value)}/></Field>
 <Field label="Faturamento real"><input type="number" min="0" step="0.01" className="input" value={revenue} onChange={e=>setRevenue(e.target.value)}/></Field><div className="full"><Field label="Notas"><textarea className="textarea" maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Criativo testado, segmentação, hipóteses..."/></Field></div>
 {error&&<div className="full"><Feedback type="error">{error}</Feedback></div>}{success&&<div className="full"><Feedback type="success">{success}</Feedback></div>}
 <div className="full"><button disabled={saving||!productId} className="btn btn-primary wide" type="submit"><Save size={16}/> Salvar resultados reais</button></div></form></Section></div></div>
 <Section title="Histórico de testes" description="Relatório preenchido manualmente; custo do produto não está descontado da coluna de receita menos mídia.">{historical.length===0?<Empty icon={<Calculator size={25}/>} headline="Nenhum teste registrado" description="Depois de rodar uma campanha, coloque os resultados aqui para aprender com os testes."/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Produto</th><th>Gasto</th><th>Cliques</th><th>Vendas</th><th>Receita</th><th>CPA mídia</th><th>Receita – mídia</th><th></th></tr></thead><tbody>{historical.map(t=>{const pr=products.find(p=>p.id===t.product_id);return <tr key={t.id}><td>{shortDate(t.start_date)}</td><td>{pr?.name||'—'}</td><td>{brl(t.spend,pr?.currency)}</td><td>{t.clicks}</td><td>{t.sales}</td><td>{brl(t.revenue,pr?.currency)}</td><td>{t.sales?brl(t.spend/t.sales,pr?.currency):'—'}</td><td><strong style={{color:t.revenue-t.spend>=0?'#3ce0a1':'#e9a2a9'}}>{brl(t.revenue-t.spend,pr?.currency)}</strong></td><td><button className="icon-button" aria-label="Excluir registro" onClick={()=>remove(t.id)}><Trash2 size={14}/></button></td></tr>})}</tbody></table></div>}</Section>
 </>}
 </>;
}
export default function Simulator(){return <Suspense fallback={<Load/>}><SimulatorCore/></Suspense>}
