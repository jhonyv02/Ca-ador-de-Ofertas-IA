import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function isPublicIp(address) {
  const version=isIP(address);
  if(version===4){
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||
      a===169&&b===254||a===172&&b>=16&&b<=31||
      a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||
      a===198&&(b===18||b===19||b===51&&c===100)||
      a===203&&b===0&&c===113);
  }
  if(version===6){
    const v=address.toLowerCase().split('%')[0];
    return /^[23][0-9a-f]{3}:/.test(v)&&!v.startsWith('2001:db8:')&&!v.startsWith('::ffff:');
  }
  return false;
}
export function validateAddressSyntax(value){
  if(typeof value!=='string'||value.length>1800)throw Error('Endereço inválido.');
  let url;
  try{url=new URL(value.trim());}catch{throw Error('Digite a URL completa, iniciando por https://.');}
  const h=url.hostname.toLowerCase().replace(/\.$/,'');
  if(url.protocol!=='https:'||url.username||url.password||
     url.port&&url.port!=='443'||h.length>253||!h.includes('.')||isIP(h)||
     /(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(h))
    throw Error('Só é permitido navegar em domínios públicos HTTPS.');
  return url;
}
export async function assertPublicUrl(value){
  const url=validateAddressSyntax(value);
  const resolved=await lookup(url.hostname,{all:true});
  if(!resolved.length||resolved.some(a=>!isPublicIp(a.address)))
    throw Error('Destino bloqueado: endereço de rede não público.');
  return url;
}
