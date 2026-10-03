import {getAuthContext} from '@/lib/auth';
export default async function MailPage(){await getAuthContext();return <iframe src="/mail/client/index.html" title="AXXES Mail" style={{width:'100%',height:'100dvh',border:0,display:'block'}} />;}
