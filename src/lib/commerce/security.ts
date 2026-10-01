import{createHmac,timingSafeEqual}from'node:crypto';
export function verifyCapability(expected:string,actual:string){const a=Buffer.from(expected),b=Buffer.from(actual);return a.length===b.length&&timingSafeEqual(a,b);}
export function verifyNotification(secret:string,header:string,body:string,now=Math.floor(Date.now()/1000)){
 if(secret.length<24||body.length>1_000_000)return false;
 const match=/^t=(\d{1,12}),v1=([a-f0-9]{64})$/.exec(header);if(!match)return false;
 const timestamp=Number(match[1]);if(Math.abs(now-timestamp)>300)return false;
 return verifyCapability(createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex'),match[2]);
}
