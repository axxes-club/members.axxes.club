import{principalOwner}from'../gcs/router.mjs';
export function planBackfill({assets,objects,receipts}) {
 const verified=new Map(objects.map(o=>[o.key+'\0'+o.generation,o])),attributed=[],legacy=[],seen=new Set();
 for(const asset of assets){
  const receipt=receipts.find(r=>r.result?.serverData?.assetId===asset.id && r.document?.metadata?.tenantId===asset.tenantId && r.result.key===asset.objectKey);
  const result=receipt?.result,object=result?verified.get(result.key+'\0'+result.generation):null;
  let ownerMatches=false;try{ownerMatches=!!receipt&&principalOwner(receipt.document.metadata)===receipt.owner;}catch{}
  const userId=receipt?.document.metadata.chargingUserId??receipt?.document.metadata.userId;
  if(object&&ownerMatches&&userId&&['dam','members'].includes(receipt.document.app)&&object.size===receipt.document.descriptor.size){
   const identity=object.key+'\0'+object.generation;if(!seen.has(identity)){attributed.push({...asset,userId,generation:object.generation,bytes:String(object.size)});seen.add(identity);}
  }else{
   const object=objects.find(o=>o.key===asset.objectKey);if(object)legacy.push({...asset,generation:object.generation,bytes:String(object.size)});
  }
 }
 const owned=new Set(attributed.map(x=>x.tenantId+"\0"+x.objectKey+"\0"+x.generation));
 return {attributed,legacy:legacy.filter(x=>!owned.has(x.tenantId+"\0"+x.objectKey+"\0"+x.generation))};
}
