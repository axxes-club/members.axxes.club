'use client';
import {useEffect,useState} from 'react';
import {Puck,type Data} from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import {gangstarzConfig} from '@/lib/puck/gangstarz';
import {toPuck,fromPuck} from '@/lib/website/gangstarz-adapter';
import type {SiteSnapshotV1} from '@/lib/website/schema';
export function GangstarzEditor(){
 const [snapshot,setSnapshot]=useState<SiteSnapshotV1|null>(null),[data,setData]=useState<Data|null>(null),[message,setMessage]=useState('Loading Gangstarz workspace…'),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[revisions,setRevisions]=useState<{revision:number;created_at:string}[]>([]),[key,setKey]=useState(0);
 async function load(){const res=await fetch('/api/v1/website/gangstarz',{cache:'no-store'});const body=await res.json();if(!res.ok)throw new Error(body.error);setSnapshot(body.data);setData(toPuck(body.data));setRevisions(body.revisions);setDirty(false);setKey(k=>k+1);setMessage('Draft loaded. Publish when you are ready.');}
 useEffect(()=>{load().catch(e=>setMessage(e.message))},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault()};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 async function action(action:string,revision?:number){if(!snapshot||!data)return;setBusy(true);try{
  const res=await fetch('/api/v1/website/gangstarz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,revision,expectedRevision:snapshot.revision,data:action==='save'?fromPuck(data,snapshot):undefined})});const body=await res.json();if(!res.ok)throw new Error(body.error);
  if(action==='save'){setSnapshot(s=>s?{...s,revision:body.revision}:s);setDirty(false);setMessage('Draft saved. The live site has not changed.');}
  else if(action==='publish')setMessage('Published to gangstarz.axxes.club.');
  else if(action==='unpublish')setMessage('Website unpublished.');else await load();
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to complete action')}finally{setBusy(false)}}
 return <div><header style={{padding:20,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><div style={{marginRight:'auto'}}><h1 style={{fontSize:24,fontWeight:700}}>Gangstarz website</h1><p>Manage your brand, pages, events presentation, gallery, and shop.</p></div><button disabled={busy} onClick={()=>action('save')}>Save draft</button><a href="https://gangstarz.axxes.club/preview/home" target="_blank" rel="noopener noreferrer">Preview saved draft ↗</a><button disabled={busy||dirty} onClick={()=>action('publish')}>Publish</button><a href="https://gangstarz.axxes.club" target="_blank" rel="noopener noreferrer">View website ↗</a></header><p role="status" style={{padding:'0 20px 15px'}}>{message}{dirty?' • Unsaved changes':''}</p>{snapshot&&data?<><Puck key={key} config={gangstarzConfig} data={data} onChange={d=>{setData(d);setDirty(true)}} onPublish={()=>action('save')}/><details style={{padding:20}}><summary>Revision history and publishing options</summary><button onClick={()=>load().catch(e=>setMessage(e.message))}>Reload saved draft and history</button><button disabled={busy} onClick={()=>action('unpublish')}>Unpublish website</button>{revisions.map(r=><div key={r.revision}>Revision {r.revision} · {new Date(r.created_at).toLocaleString()} <button disabled={busy} onClick={()=>action('restore',r.revision)}>Restore as draft</button></div>)}</details></>:<div style={{padding:20}}><a href="/sign-in">Sign in to AXXES</a><button onClick={()=>load().catch(e=>setMessage(e.message))}>Retry</button></div>}</div>
}
