import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
test('password reset uses the installed Nodemailer SMTP transport',async()=>{
 let message='';const clients=new Set<net.Socket>();
 const server=net.createServer(socket=>{clients.add(socket);socket.on('close',()=>clients.delete(socket));socket.write('220 unit.local ESMTP\r\n');let buffer='',data=false;
  socket.on('data',chunk=>{buffer+=chunk.toString();for(;;){const end=buffer.indexOf('\r\n');if(end<0)break;const line=buffer.slice(0,end);buffer=buffer.slice(end+2);if(data){if(line==='.') {data=false;socket.write('250 accepted\r\n');}else message+=line+'\n';}else if(/^EHLO|^HELO/.test(line))socket.write('250 unit.local\r\n');else if(/^MAIL FROM:|^RCPT TO:/.test(line))socket.write('250 accepted\r\n');else if(line==='DATA'){data=true;socket.write('354 send data\r\n');}else if(line==='QUIT'){socket.end('221 closing\r\n');}else socket.write('250 ok\r\n');}});
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const keys=['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','FROM_EMAIL'] as const;const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_PORT=String((server.address() as net.AddressInfo).port);process.env.SMTP_SECURE='false';delete process.env.SMTP_USER;delete process.env.SMTP_PASS;process.env.FROM_EMAIL='reset@example.test';
 try{const {sendPasswordResetEmail}=await import('../src/lib/email');await sendPasswordResetEmail({email:'recipient@example.test',resetLink:'https://members.example.test/reset?token=unit-only'});assert.match(message,/To: recipient@example\.test/);assert.match(message,/Subject: Reset your password/);assert.match(message,/members\.example\.test/);}finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}for(const socket of clients)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
