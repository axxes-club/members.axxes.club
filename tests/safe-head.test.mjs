import test from 'node:test';import assert from 'node:assert/strict';
import {safeHead,isPublicAddress} from '../src/lib/security/safe-head.mjs';
test('refuses internal destinations before opening a connection',async()=>{
 let connected=0;
 for(const url of ['http://127.0.0.1/','http://[::1]/','http://169.254.169.254/','http://internal.test/','https://public.test/']){
  await assert.rejects(safeHead(url,{resolve:async()=>[{address:'10.1.2.3',family:4}],request:async()=>{connected++;return {status:200,headers:{}}}}));
 }
 assert.equal(connected,0);
});
test('public redirects are revalidated and cannot rebind to private IP',async()=>{
 let connected=0;
 await assert.rejects(safeHead('https://public.test/',{resolve:async host=>[{address:host==='public.test'?'8.8.8.8':'127.0.0.1',family:4}],request:async()=>{connected++;return {status:302,headers:{location:'http://internal.test/'}}}}));
 assert.equal(connected,1);
});
test('valid public HEAD pins the resolved address and returns bounded metadata',async()=>{
 let destination;
 const result=await safeHead('https://public.test/file',{resolve:async()=>[{address:'8.8.8.8',family:4}],request:async(_url,address)=>{destination=address;return {status:200,headers:{'content-type':'image/png','content-length':'123'}}}});
 assert.equal(destination.address,'8.8.8.8');assert.equal(result.headers['content-type'],'image/png');
});
test('special ranges, mapped IPv6 and credentials cannot bypass policy',async()=>{
 for(const ip of ['0.0.0.0','100.64.0.1','192.0.0.1','198.18.0.1','224.0.0.1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('8.8.8.8'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
 await assert.rejects(safeHead('https://name:pass@public.test/'));await assert.rejects(safeHead('http://public.test:8080/'));
});
