export function createMailClient(request){
 let base='';
 async function call(method,args,id){if(!base)throw new Error('Choose a mailbox first');const response=await request(base+'/jmap',{method:'POST',body:{methodCalls:[[method,args,id]]}});const result=response.methodResponses?.find(item=>item[2]===id);if(!result||result[0]==='error')throw new Error(result?.[1]?.type||'Mailbox operation failed');if(result[0]!==method)throw new Error('Unexpected mailbox response');return result[1];}
 return {
 bind(organizationId,mailboxId){base='/v1/organizations/'+encodeURIComponent(organizationId)+'/mailboxes/'+encodeURIComponent(mailboxId);},
 session(){return request(base+'/session');},
 folders(){return call('Mailbox/get',{},'folders').then(x=>x.list||[]);},
 search({text,folder,position=0}={}){return call('Email/query',{filter:{...(text?{text}:{}),...(folder?{inMailbox:folder}:{})},sort:[{property:'receivedAt',isAscending:false}],position,limit:50,calculateTotal:true},'query');},
 messages(ids){return call('Email/get',{ids,properties:['id','threadId','mailboxIds','keywords','from','to','subject','receivedAt','preview','hasAttachment']},'messages').then(x=>x.list||[]);},
 message(id){return call('Email/get',{ids:[id],properties:['id','threadId','mailboxIds','keywords','from','to','cc','subject','receivedAt','textBody','htmlBody','bodyValues','attachments'],fetchTextBodyValues:true},'detail').then(x=>x.list?.[0]);},
 mutate(ids,patch){return call('Email/set',{update:Object.fromEntries(ids.map(id=>[id,patch]))},'mutation').then(x=>{if(x.notUpdated&&Object.keys(x.notUpdated).length)throw new Error('Some messages could not be changed');return x;});},
 remove(ids){return call('Email/set',{destroy:ids},'remove').then(x=>{if(x.notDestroyed&&Object.keys(x.notDestroyed).length)throw new Error('Some messages could not be deleted');return x;});},
 identities(){return call('Identity/get',{},'identities').then(x=>x.list||[]);},
 async saveDraft(draft){const value={mailboxIds:{[draft.mailboxId]:true},keywords:{$draft:true},from:[{email:draft.from}],to:draft.to.split(',').map(x=>x.trim()).filter(Boolean).map(email=>({email})),subject:draft.subject,textBody:[{partId:'text',type:'text/plain'}],bodyValues:{text:{value:draft.text}}};const result=await call('Email/set',draft.id?{update:{[draft.id]:value}}:{create:{[draft.operationId]:value}},'draft');if(result.notCreated?.[draft.operationId]||result.notUpdated?.[draft.id])throw new Error('Draft could not be saved');return draft.id||result.created?.[draft.operationId]?.id;},
 async send({draftId,identityId,operationId}){const result=await call('EmailSubmission/set',{create:{[operationId]:{emailId:draftId,identityId}}},'send');if(result.notCreated?.[operationId])throw new Error('Submission was rejected');if(!result.created?.[operationId])throw new Error('Submission status is unknown; check Sent before retrying');return result.created[operationId];}
 };
}
