import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {BlockList,isIP} from 'node:net';
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['192.88.99.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(address,prefix,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
for(const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16]])blocked.addSubnet(address,prefix,'ipv6');
export class UnsafeDestinationError extends Error {}
export function isPublicAddress(address){const family=isIP(address);return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');}
function head(target,pinned,timeoutMs){return new Promise((resolve,reject)=>{
 const req=(target.protocol==='https:'?httpsRequest:httpRequest)(target,{method:'HEAD',maxHeaderSize:16384,lookup:(_name,options,callback)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},res=>{resolve({status:res.statusCode??0,headers:res.headers});res.destroy();});
 const timer=setTimeout(()=>req.destroy(new Error('Metadata request timed out')),timeoutMs);timer.unref();req.on('error',reject);req.on('close',()=>clearTimeout(timer));req.end();
});}
/** Validate every redirect and pin the socket lookup to validated public DNS answers. */
export async function safeHead(raw,{resolve=host=>lookup(host,{all:true}),request=head,timeoutMs=5000}={}){
 let target=new URL(raw);const deadline=Date.now()+timeoutMs;
 for(let redirects=0;redirects<=3;redirects++){
  if(!['http:','https:'].includes(target.protocol)||target.username||target.password||target.port)throw new UnsafeDestinationError('Use a public HTTP(S) URL on its default port');
  const host=target.hostname.replace(/^\[|\]$/g,''),remaining=deadline-Date.now();if(remaining<=0)throw Error('Metadata request timed out');
  let timer;const addresses=await Promise.race([isIP(host)?Promise.resolve([{address:host,family:isIP(host)}]):resolve(host),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timed out')),remaining);timer.unref();})]).finally(()=>clearTimeout(timer));
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new UnsafeDestinationError('Metadata destination must be public');
  const response=await request(target,addresses[0],Math.max(1,deadline-Date.now()));
  if([301,302,303,307,308].includes(response.status)){if(redirects===3||typeof response.headers.location!=='string')throw Error('Metadata redirect limit exceeded');target=new URL(response.headers.location,target);continue;}
  return response;
 }
 throw Error('Metadata unavailable');
}
