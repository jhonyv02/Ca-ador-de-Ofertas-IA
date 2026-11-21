import test from 'node:test';
import assert from 'node:assert/strict';
import {researchMonitor,researchDecision,researchProgress,canRecommendTest,funnelLabels} from '../lib/research-pipeline.ts';

function monitor(day,evidence=[],eventId='id-'+day){
 return {kind:'product',created_at:day+'T12:00:00Z',
   breakdown:{research_monitor:{event_id:eventId,observed_on:day,monitor_until:'2026-11-28',
     source_key:'pasta-da-familia',changes:[],evidence_urls:evidence,funnel_hypothesis:''}}};
}
const audit={kind:'openai_audit',score:89,confidence:'medium',verdict:'approve'};
test('reconhece sete dias de acompanhamento com fontes e conclusão do período',()=>{
 const days=[21,22,23,24,25,26,27].map(d=>monitor('2026-11-'+d,d===21?['https://example.com/a']:d===27?['https://example.com/b']:[]));
 const result=researchProgress(days,'2026-11-28',new Date('2026-11-29T03:00:00Z'));
 assert.equal(result.days,7);
 assert.equal(result.evidenceCount,2);
 assert.equal(result.enoughForReview,true);
 assert.equal(canRecommendTest(audit,result),true);
});
test('não recomenda teste sem 7 dias, sem fontes ou com auditoria desfavorável',()=>{
 const logs=[monitor('2026-11-21',['https://example.com/a'])];
 const result=researchProgress(logs,'2026-11-28',new Date('2026-11-29T04:00:00Z'));
 assert.equal(canRecommendTest(audit,result),false);
 assert.equal(canRecommendTest({...audit,score:77},{...result,enoughForReview:true}),false);
 assert.equal(canRecommendTest({...audit,verdict:'needs_work'},{...result,enoughForReview:true}),false);
});
test('extrai as informações de funil e linha do tempo',()=>{
 const item=monitor('2026-11-21');
 assert.equal(researchMonitor(item).monitor_until,'2026-11-28');
 assert.equal(researchDecision({breakdown:{research_decision:{funnel:'hybrid',funnel_reason:'Atendimento opcional'}}}).funnel,'hybrid');
 assert.ok(funnelLabels.hybrid.includes('WhatsApp'));
});
