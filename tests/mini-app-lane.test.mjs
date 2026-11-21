import test from 'node:test';
import assert from 'node:assert/strict';
import {isMiniApp,researchLaneError} from '../lib/mini-app-lane.ts';
test('radar separa software de imprimíveis, incluindo cadastros legados',()=>{
  assert.equal(isMiniApp({product_type:'saas',format:'app'}),true);
  assert.equal(isMiniApp({product_type:'digital',format:'app'}),true);
  assert.equal(isMiniApp({product_type:'digital',format:'printable'}),false);
});
test('aceita somente payloads classificados e completos na rota de mini apps',()=>{
  const valid={sourceKey:'mini-calc',format:'app',hasMiniData:true};
  assert.equal(researchLaneError('mini_apps',valid),null);
  assert.notEqual(researchLaneError('offers',valid),null);
  assert.notEqual(researchLaneError('mini_apps',{...valid,hasMiniData:false}),null);
  assert.notEqual(researchLaneError('mini_apps',{...valid,sourceKey:'pasta-familia'}),null);
  assert.equal(researchLaneError('offers',{sourceKey:'pasta-familia',format:'ebook',hasMiniData:false}),null);
});
