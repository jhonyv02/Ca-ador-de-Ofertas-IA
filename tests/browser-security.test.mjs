import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAddressSyntax,isPublicIp} from '../browser-worker/security.mjs';
test('apenas páginas HTTPS com domínios públicos',()=>{
  assert.equal(validateAddressSyntax('https://www.example.com/oferta').hostname,'www.example.com');
  for(const v of ['http://example.com','file:///etc/passwd','https://127.0.0.1/','https://localhost/','https://user:pass@example.com','https://example.com:3000/'])assert.throws(()=>validateAddressSyntax(v));
});
test('bloqueia endereços privados, metadata e reservados',()=>{
  for(const v of ['10.0.0.1','127.0.0.1','169.254.169.254','172.16.5.1','192.168.0.1','100.64.0.1','192.0.2.1','203.0.113.5','::1','fc00::1','2001:db8::1'])assert.equal(isPublicIp(v),false,v);
  assert.equal(isPublicIp('8.8.8.8'),true);
  assert.equal(isPublicIp('2606:4700:4700::1111'),true);
});
