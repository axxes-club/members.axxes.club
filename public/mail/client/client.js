export function createMailClient(request){
 let base='';
 const owned=(path,options)=>{if(!base)throw new Error('Choose a mailbox first');return request(base+path,options);};
 async function call(method,args,id){if(!base)throw new Error('Choose a mailbox first');const response=await request(base+'/jmap',{method:'POST',body:{methodCalls:[[method,args,id]]}});const result=response.methodResponses?.find(item=>item[2]===id);if(!result||result[0]==='error')throw new Error(result?.[1]?.type||'Mailbox operation failed');if(result[0]!==method)throw new Error('Unexpected mailbox response');return result[1];}
 return {
 bind(organizationId,mailboxId){base='/v1/organizations/'+encodeURIComponent(organizationId)+'/mailboxes/'+encodeURIComponent(mailboxId);},
 listDrafts(){return owned('/drafts');},
 readDraft(draftId,revision){return owned('/drafts/'+encodeURIComponent(draftId)+(revision===undefined?'':'?revision='+encodeURIComponent(revision)));},
 saveRevision({draftId,operationId,expectedRevision,body}){return owned('/drafts/'+encodeURIComponent(draftId),{method:'POST',key:operationId,body:{expectedRevision,body}});},
 queueRevision({draftId,operationId,revision,timezone,scheduledAt}){return owned('/drafts/'+encodeURIComponent(draftId)+'/outbox',{method:'POST',key:operationId,body:{revision,timezone,...(scheduledAt?{scheduledAt}:{})}});},
 queued(id){return owned('/outbox/'+encodeURIComponent(id));},
 cancelQueued(id){return owned('/outbox/'+encodeURIComponent(id)+'/cancel',{method:'POST',body:{}});},
 async uploadAttachment(file){if(!base)throw new Error('Choose a mailbox first');if(!file||file.size>1048576||file.size<1)throw new Error('Choose an attachment between 1 byte and 1 MiB.');const result=await request(base+'/attachments',{method:'POST',rawBody:file});return {...result,name:file.name,type:file.type||result.type||'application/octet-stream'};},
 downloadAttachment(messageId,partId){return request(base+'/messages/'+encodeURIComponent(messageId)+'/attachments/'+encodeURIComponent(partId),{download:true});},
 session(){return request(base+'/session');},
 folders(){return call('Mailbox/get',{},'folders').then(x=>x.list||[]);},
 search({text,folder,position=0}={}){return call('Email/query',{filter:{...(text?{text}:{}),...(folder?{inMailbox:folder}:{})},sort:[{property:'receivedAt',isAscending:false}],position,limit:50,calculateTotal:true},'query');},
 messages(ids){return call('Email/get',{ids,properties:['id','threadId','mailboxIds','keywords','from','to','subject','receivedAt','preview','hasAttachment']},'messages').then(x=>x.list||[]);},
 message(id){return call('Email/get',{ids:[id],properties:['id','threadId','mailboxIds','keywords','from','to','cc','subject','receivedAt','textBody','htmlBody','bodyValues','attachments'],fetchTextBodyValues:true},'detail').then(x=>x.list?.[0]);},
 mutate(ids,patch){return call('Email/set',{update:Object.fromEntries(ids.map(id=>[id,patch]))},'mutation').then(x=>{if(x.notUpdated&&Object.keys(x.notUpdated).length)throw new Error('Some messages could not be changed');return x;});},
 remove(ids){return call('Email/set',{destroy:ids},'remove').then(x=>{if(x.notDestroyed&&Object.keys(x.notDestroyed).length)throw new Error('Some messages could not be deleted');return x;});},
 identities(){return call('Identity/get',{},'identities').then(x=>x.list||[]);},
 async saveDraft(draft){const value={mailboxIds:{[draft.mailboxId]:true},keywords:{$draft:true},from:[{email:draft.from}],to:draft.to.split(',').map(x=>x.trim()).filter(Boolean).map(email=>({email})),subject:draft.subject,textBody:[{partId:'text',type:'text/plain'}],bodyValues:{text:{value:draft.text}},...(draft.attachments?.length?{attachments:draft.attachments.map(({blobId,name,type})=>({blobId,name,type}))}:{})};const creationId=draft.id?crypto.randomUUID():draft.operationId,result=await call('Email/set',{create:{[creationId]:value}},'draft');if(result.notCreated?.[creationId])throw new Error('Draft could not be saved; the previous copy is retained.');const id=result.created?.[creationId]?.id;if(!id||id===draft.id)throw new Error('Draft save status is unknown. Check Drafts before retrying.');let retainedPrevious=false;if(draft.id){try{const cleanup=await call('Email/set',{destroy:[draft.id]},'draft-cleanup');retainedPrevious=!cleanup.destroyed?.includes(draft.id);}catch{retainedPrevious=true;}}return {id,retainedPrevious};},
 async send({draftId,identityId,operationId}){const result=await call('EmailSubmission/set',{create:{[operationId]:{emailId:draftId,identityId}}},'send');if(result.notCreated?.[operationId])throw new Error('Submission was rejected');if(!result.created?.[operationId])throw new Error('Submission status is unknown; check Sent before retrying');return result.created[operationId];}
 };
}
